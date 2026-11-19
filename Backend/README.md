# Supabase setup

1. Create a Supabase project.
2. In the Supabase SQL Editor, run the full [`supabase-schema.sql`](./supabase-schema.sql). If you already ran an earlier version, run this updated script again to allow the fourth progress step and add payment-reference and payment-status columns.
3. Copy the project URL and its publishable key (or legacy anon key) into [`Frontend/supabase-config.js`](../Frontend/supabase-config.js).
4. Serve the `Frontend` folder over HTTPS or localhost and open `index.html`. The form needs a secure browser context for its submission ID.

When the user clicks **Save and continue**, the form inserts a snapshot of that step into `scholarship_application_progress`. Finishing the fourth step uploads files, stores the M-Pesa transaction reference and creates a consolidated row in `scholarship_interests`. Payment is manual via M-Pesa Buy Goods, Till 8028258 (OCA COMMS), for KSh 5,000; the site does not initiate or verify payments. The payment status defaults to `pending_verification`; entering a reference is not proof of payment. Verify the M-Pesa confirmation independently before an authorized project user updates the status. These submissions are inserts only from the browser; it cannot read or edit submitted rows. If someone goes back and saves a step again, the progress table keeps both snapshots. The consolidated table contains the latest completed submission.

The anonymous browser key has insert-only row-level security policies. Never put a `service_role` key in frontend code. The document bucket is private and the website has no read policy for submissions or uploaded files. View records in **Table Editor → scholarship_application_progress** and **Table Editor → scholarship_interests**. Files can be managed by an authorized project user in **Storage → scholarship-documents**.

The form accepts CVs and transcripts (PDF, DOC, or DOCX, up to 5 MB). It does not collect ID numbers or identity-document copies. Anonymous submissions can still be abused; before public launch, add rate limiting and bot protection, review your privacy/retention obligations, and test the policies in a separate project.
