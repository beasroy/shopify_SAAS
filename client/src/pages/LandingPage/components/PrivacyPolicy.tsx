import Navbar from "./Navbar";

function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <Navbar />
      <div className="container mx-auto px-6 py-12 max-w-5xl space-y-4">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">
          Privacy Policy
        </h1>
        <p className="text-lg text-slate-600">
        Your privacy is critical to us. Likewise, we have built up this Policy with the end goal you should see how we gather, utilize, impart and reveal and make utilization of individual data. The following blueprints our privacy policy
        </p>

        <ul className="list-disc pl-6 space-y-4 text-slate-700">
          <li>Before or at the time of collecting personal information, we will identify the purposes for which information is being collected.</li>
          <li>We will gather and utilization of individual data singularly with the target of satisfying those reasons indicated by us and for other good purposes, unless we get the assent of the individual concerned or as required by law.</li>
          <li>We will just hold individual data the length of essential for the satisfaction of those reasons</li>
          <li>We will gather individual data by legal and reasonable means and, where fitting, with the information or assent of the individual concerned</li>
          <li>Personal information ought to be important to the reasons for which it is to be utilized, and, to the degree essential for those reasons, ought to be exact, finished, and updated.</li>
          <li>We will protect individual data by security shields against misfortune or burglary, and also unapproved access, divulgence, duplicating, use or alteratio.</li>
          <li>We will promptly provide customers with access to our policies and procedures for the administration of individual data.</li>
          <li>
            For any concerns, please email us at{" "}
            <a
              href="mailto:team@messold.com"
              className="text-blue-600 hover:underline"
            >
              team@messold.com
            </a>
            .
          </li>
        </ul>

        <p className="text-sm text-slate-500">Last updated: March 19, 2025</p>
      </div>
    </div>
  );
}

export default PrivacyPolicy;
