# Supabase setup

1. Create a Supabase project.
2. In the Supabase SQL Editor, run the full [`supabase-schema.sql`](./supabase-schema.sql). If you already ran an earlier version, run this updated script again to create the progress table and add document-reference columns.
3. Copy the project URL and its publishable key (or legacy anon key) into [`Frontend/supabase-config.js`](../Frontend/supabase-config.js).
4. Serve the `Frontend` folder over HTTPS or localhost and open `index.html`. The form needs a secure browser context for its submission ID.

When the user clicks **Save and continue**, the form inserts a snapshot of that step into `scholarship_application_progress`. Finishing the last step uploads files and creates a consolidated row in `scholarship_interests`. These are inserts only; the browser cannot read or edit submitted rows. If someone goes back and saves a step again, the progress table keeps both snapshots. The consolidated table contains the latest completed submission.

The anonymous browser key has insert-only row-level security policies. Never put a `service_role` key in frontend code. The document bucket is private and the website has no read policy for submissions or uploaded files. View records in **Table Editor → scholarship_application_progress** and **Table Editor → scholarship_interests**. Files can be managed by an authorized project user in **Storage → scholarship-documents**.

The form accepts CVs and transcripts (PDF, DOC, or DOCX, up to 5 MB). It does not collect ID numbers or identity-document copies. Anonymous submissions can still be abused; before public launch, add rate limiting and bot protection, review your privacy/retention obligations, and test the policies in a separate project.
