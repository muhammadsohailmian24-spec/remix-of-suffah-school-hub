

## Plan: House-based Student List Download + Block Deactivated/Deleted Student Login

### Feature 1: Download Student List by House

Add a new download option in the Student Management page that lets admins generate a PDF student list filtered by house (e.g., IqbalHouse, Qadeer House,etc).

**Changes:**
- **`src/pages/admin/StudentManagement.tsx`**: Add a "Download by House" button/dropdown near the existing filters. It will:
  - Fetch all houses from the `houses` table
  - Show a dialog/dropdown to select a house
  - Fetch all active students belonging to that house (via `students.house_id`)
  - Join with profiles for names, addresses, phones
  - Generate PDF using the existing `downloadStudentListPdf` utility with the house name as the title

### Feature 2: Block Deactivated/Deleted Students from Logging In

When a student is deactivated or deleted, their auth account should be disabled so they cannot log in.

**Changes:**

- **`supabase/functions/create-user/index.ts`** (or a new edge function): We need a mechanism to ban/unban users via the Supabase Admin API. The approach:
  - Create a new edge function `manage-user-status/index.ts` that accepts `{ userId, action: "ban" | "unban" }` and calls `supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: "876600h" })` to ban or `{ ban_duration: "none" }` to unban.
  - Only admins can invoke this function (verified via JWT + role check).

- **`src/pages/admin/StudentManagement.tsx`**:
  - In `handleToggleStatus`: After setting student status to "inactive", call the `manage-user-status` edge function with `action: "ban"`. When reactivating, call with `action: "unban"`.
  - In `handleDelete`: Before deleting the student record, call the edge function with `action: "ban"` (or optionally delete the auth user entirely via `supabaseAdmin.auth.admin.deleteUser`).

### Technical Details

**New Edge Function: `supabase/functions/manage-user-status/index.ts`**
- Accepts POST with `{ userId: string, action: "ban" | "unban" | "delete" }`
- Verifies caller is an admin (same pattern as `create-user`)
- Uses `supabaseAdmin.auth.admin.updateUserById()` for ban/unban
- Uses `supabaseAdmin.auth.admin.deleteUser()` for delete

**Student Management Updates:**
- `handleToggleStatus()` -- after toggling `students.status`, invoke `manage-user-status` with ban/unban
- `handleDelete()` -- invoke `manage-user-status` with delete action, then delete student record

**House-based Student List:**
- Fetch houses from DB
- Show selection dialog with house list
- Query `students` table filtered by `house_id` and `status = 'active'`
- Join profiles for full data
- Pass to existing `downloadStudentListPdf` with house name as title

### Summary of Files to Create/Edit

| File | Action |
|------|--------|
| `supabase/functions/manage-user-status/index.ts` | Create -- edge function to ban/unban/delete auth users |
| `src/pages/admin/StudentManagement.tsx` | Edit -- add house-based download + call manage-user-status on deactivate/delete |

