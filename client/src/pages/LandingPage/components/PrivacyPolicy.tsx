import Footer from "./Footer";
import Navbar from "./Navbar";
import { privacyPolicySections } from "@/data/constant";

function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 text-slate-800">
      <Navbar />
      <div className="max-w-4xl mx-auto p-6 my-5">
        <div className="bg-white shadow-lg rounded-2xl p-8">
          <h1 className="text-4xl font-extrabold text-center text-gray-900 mb-6">Privacy Policy</h1>
          
          {privacyPolicySections.map((section) => (
            <section key={section.title} className="mb-6 border-b pb-4 last:border-none">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">{section.title}</h2>
              {section.content.map((para: string | string[]) => (
                typeof para === "string" ? (
                  <p key={`${section.title}-${para.slice(0, 20)}`} className="text-gray-700 mb-2">{para}</p>
                ) : (
                  <ul key={`${section.title}-list-${para[0]?.slice(0, 20)}`} className="list-disc pl-5 text-gray-700">
                    {para.map((item) => (
                      <li key={`${section.title}-item-${item.slice(0, 20)}`}>{item}</li>
                    ))}
                  </ul>
                )
              ))}
            </section>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default PrivacyPolicy;
