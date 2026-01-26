// dubai-control/src/pages/CreateJob.tsx

import { Navigate } from "react-router-dom";

/**
 * Legacy route: /create-job
 *
 * We no longer use a standalone "Create Job" page.
 * All job creation is handled inside the Job Planning view.
 *
 * This component simply redirects to /planning to avoid broken links.
 */
export default function CreateJobRedirect() {
  return <Navigate to="/planning" replace />;
}
