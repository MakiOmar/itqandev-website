# Qwik Rendering Model - Explained

This document explains how our Qwik application handles server-side rendering (SSR) and client-side hydration, with specific examples from our codebase.

## Overview: Does Qwik Render Everything on the Server?

**No, Qwik does not render everything on the server.** Qwik uses a hybrid approach:

1. **Server-Side Rendering (SSR)**: Initial HTML is generated on the server for faster first paint and SEO
2. **Resumability**: Qwik uses "resumability" instead of traditional hydration - it serializes component state and resumes execution on the client with minimal JavaScript
3. **Client-Side Execution**: Some code runs only on the client (e.g., `useVisibleTask$`, event handlers)

---

## Server vs Client Rendering Examples

### Example 1: Server-Rendered (Edit Project Page Structure)

**File**: `website/src/routes/admin/projects/[id]/index.tsx`

The edit project page structure is **fully rendered on the server**:

```typescript
// This runs on the SERVER during SSR
export const useProject = routeLoader$(async ({ params, fail, cookie, request }) => {
  // Server-side API call
  const apiClient = getApiClient(cookieHeader);
  const response = await apiClient.get<Project>(API_ENDPOINTS.PROJECTS.GET(params.id));
  return project as Project;
});

// This also runs on the SERVER
export const useCategoriesAndSkills = routeLoader$(async ({ cookie, request }) => {
  const apiClient = getApiClient(cookieHeader);
  const [categoriesRes, skillsRes] = await Promise.all([...]);
  return { categories, skills };
});
```

**What this means:**
- The project data, categories, and skills are fetched on the server
- The HTML with form fields, labels, and initial values is generated on the server
- When the page loads, the form is already populated with data
- No loading spinner for initial data (it's in the HTML)

**Evidence**: Check the page source (View Source in browser) - you'll see the form fields with values already populated.

---

### Example 2: Client-Side Only (Media Library Component)

**File**: `website/src/components/media/MediaLibrary.tsx`

The Media Library component is **rendered on the client only**:

```typescript
// This runs ONLY on the CLIENT after component becomes visible
useVisibleTask$(() => {
  loadMedia(1); // Loads media from API
});

// This also runs ONLY on the CLIENT
useVisibleTask$(({ track, cleanup }) => {
  track(() => searchQuery.value);
  const timeout = setTimeout(() => {
    debouncedSearch.value = searchQuery.value;
    loadMedia(1);
  }, 300);
  cleanup(() => clearTimeout(timeout));
});
```

**What this means:**
- The Media Library component structure (HTML) is server-rendered, but empty
- The actual media list is loaded via API call **on the client** after the component becomes visible
- Console logs inside `useVisibleTask$` will appear in the browser console, not server logs
- The media list is not in the initial HTML

**Evidence**: 
- View page source - you won't see the media items in the HTML
- Open browser DevTools Network tab - you'll see API calls to `/api/v1/media` when the modal opens
- Console logs from `MediaLibrary` appear in browser console, not server terminal

---

## Is the Edit Project Page Fully Rendered on the Server?

**Partially yes, but with important caveats:**

### Server-Rendered Parts:
1. ✅ **Page structure** (HTML, form fields, labels)
2. ✅ **Initial project data** (title, description, status, etc.) - loaded via `routeLoader$`
3. ✅ **Categories and skills** - loaded via `routeLoader$`
4. ✅ **Initial media references** (hero image URL, video URL) - included in project data from `routeLoader$`

### Client-Side Only Parts:
1. ❌ **Media Library modal** - Only renders when you click "Select from Library"
2. ❌ **Media Library content** - Loaded via `useVisibleTask$` when modal opens
3. ❌ **File upload handlers** - Run on client when files are selected
4. ❌ **Form submission** - `routeAction$` runs on server, but form building happens on client

**Code Evidence**:
```typescript
// Server-rendered (runs during SSR)
const project = useProject(); // routeLoader$ - server-side
const categoriesAndSkills = useCategoriesAndSkills(); // routeLoader$ - server-side

// Client-side only (runs after page loads)
{showHeroSelector.value && (
  <MediaSelector ... /> // Modal only renders when showHeroSelector is true
)}
```

---

## Media Library Loading: Server vs Client

### When Does Media Library Load?

**Answer: Media Library loads on the client, upon request (when modal opens), not on page load.**

**Flow**:
1. **Page Load (Server)**: Edit project page HTML is generated with form fields
2. **Page Load (Client)**: HTML is received, Qwik resumes execution
3. **User Clicks "Select from Library"**: `showHeroSelector.value = true` triggers modal render
4. **Modal Opens (Client)**: `MediaSelector` component renders
5. **MediaLibrary Mounts (Client)**: `useVisibleTask$` hook executes
6. **API Call (Client)**: `loadMedia(1)` makes API request to fetch media list
7. **Media Renders (Client)**: Media items appear in the modal

**Code Flow**:
```typescript
// 1. Edit project page (server-rendered)
export default component$(() => {
  const showHeroSelector = useSignal(false); // Client state
  
  // 2. User clicks button (client event)
  <button onClick$={() => { showHeroSelector.value = true; }}>
  
  // 3. Modal conditionally renders (client)
  {showHeroSelector.value && <MediaSelector ... />}
});

// 4. MediaSelector renders MediaLibrary (client)
export const MediaSelector = component$(() => {
  return <MediaLibrary ... />;
});

// 5. MediaLibrary loads data (client)
export const MediaLibrary = component$(() => {
  useVisibleTask$(() => {
    loadMedia(1); // API call happens here - CLIENT SIDE
  });
});
```

**Evidence**:
- Network tab shows `/api/v1/media` request only when modal opens
- No media API call in initial page load
- Media Library HTML is not in page source

---

## Why Can't You See Console Logs in Media Library Component?

**Answer: Console logs in `useVisibleTask$` appear in the browser console, not server logs, and only when the component is visible.**

### Why Console Logs Might Not Appear:

1. **Component Not Visible Yet**
   - `useVisibleTask$` only runs when the component is visible in the DOM
   - If the modal is closed (`showHeroSelector.value = false`), the component is not rendered, so `useVisibleTask$` never executes
   - **Solution**: Open the modal first, then check browser console

2. **Server vs Client Context**
   - `useVisibleTask$` runs **only on the client**
   - Console logs from `useVisibleTask$` appear in **browser DevTools console**, not in the server terminal
   - **Solution**: Check browser DevTools Console (F12), not server terminal

3. **Component Not Mounted**
   - If the component is conditionally rendered and the condition is false, it never mounts
   - Example: `{showHeroSelector.value && <MediaSelector />}` - if `showHeroSelector.value` is `false`, the component doesn't exist in the DOM

### Where to Find Logs:

**Server-Side Logs** (routeLoader$, routeAction$):
- ✅ Server terminal/console
- ✅ Laravel logs (`storage/logs/laravel.log`)
- ❌ Browser console

**Client-Side Logs** (useVisibleTask$, event handlers):
- ✅ Browser DevTools Console (F12)
- ❌ Server terminal
- ❌ Laravel logs

### Example:

```typescript
// This log appears in SERVER terminal
export const useProject = routeLoader$(async (...) => {
  console.log('Loading project...'); // ✅ Server terminal
});

// This log appears in BROWSER console
export const MediaLibrary = component$(() => {
  useVisibleTask$(() => {
    console.log('Loading media...'); // ✅ Browser DevTools Console (F12)
    loadMedia(1);
  });
});
```

---

## Summary Table

| Component/Feature | Rendering Location | When It Executes | Where Logs Appear |
|-------------------|-------------------|-------------------|-------------------|
| Edit Project Page Structure | Server (SSR) | During page request | Server terminal |
| Project Data (`useProject`) | Server (`routeLoader$`) | During SSR | Server terminal |
| Categories/Skills (`useCategoriesAndSkills`) | Server (`routeLoader$`) | During SSR | Server terminal |
| Form Fields with Values | Server (SSR) | During page request | N/A (in HTML) |
| Media Library Modal | Client (conditional) | When `showHeroSelector = true` | Browser console |
| Media Library Data | Client (`useVisibleTask$`) | After modal opens | Browser console |
| File Upload Handlers | Client (event handlers) | When file selected | Browser console |
| Form Submission (`routeAction$`) | Server | On form submit | Server terminal |

---

## Key Takeaways

1. **Qwik uses SSR by default** - Initial HTML is server-rendered for performance and SEO
2. **`routeLoader$` runs on server** - Use for initial data loading
3. **`useVisibleTask$` runs on client** - Use for client-side data fetching and side effects
4. **Conditional rendering is client-side** - Components like modals only render when conditions are met
5. **Console logs location depends on execution context** - Server code logs to terminal, client code logs to browser console
6. **Media Library is lazy-loaded** - Only loads when modal opens, not on page load

---

## Debugging Tips

### To see server-side logs:
- Check terminal where `npm run dev` is running
- Check Laravel logs: `backend/storage/logs/laravel.log`

### To see client-side logs:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Ensure the component is visible/rendered (e.g., open the modal)
4. Look for logs from `useVisibleTask$` and event handlers

### To verify what's server-rendered:
1. View page source (Right-click → View Page Source)
2. Search for your content - if it's in the HTML, it's server-rendered
3. If content is missing from source but appears in browser, it's client-rendered

---

## References

- [Qwik Documentation - Server-Side Rendering](https://qwik.dev/docs/guides/server-side-rendering/)
- [Qwik Documentation - Resumability](https://qwik.dev/docs/concepts/resumable/)
- [Qwik Documentation - useVisibleTask$](https://qwik.dev/docs/components/tasks/#usevisibletask)
- [Qwik Documentation - routeLoader$](https://qwik.dev/docs/route-loader/)
