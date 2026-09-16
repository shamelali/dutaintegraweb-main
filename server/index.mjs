import { createServer } from "node:http";
import { handle } from "./handler.mjs";

/**
 * dutaintegra.my server. Serves the static site in Web/ and the
 * POST /api/send-email lead-capture endpoint.
 *
 *   CONTACT_INBOX_EMAIL  where enquiries are emailed (falls back to ADMIN_EMAIL)
 *   ALLOWED_ORIGINS      comma-separated origins allowed to POST (CORS + origin check)
 *   WEB_ROOT             static root (default ./Web)
 *   ENQUIRY_STORE        JSONL store path (default ./data/enquiries.jsonl)
 *   PORT / HOST          default 3000 / 0.0.0.0
 */

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";

createServer(handle).listen(PORT, HOST, () => {
  console.log(`dutaintegra.my listening on http://${HOST}:${PORT}`);
});
