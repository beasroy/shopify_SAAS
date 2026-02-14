import { ArrowUpRight } from "lucide-react";

const NewFooter = () => {
    return (
        <footer className="bg-black border-t border-primary-foreground/10 py-16">
            <div className="container mx-auto px-6">
                <div className="grid md:grid-cols-4 gap-12 mb-12">
                    {/* Brand */}
                    <div className="md:col-span-2">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-accent-gradient rounded-lg flex items-center justify-center">
                                <span className="text-primary-foreground font-bold text-xl">P</span>
                            </div>
                            <span className="text-primary-foreground font-bold text-2xl tracking-tight">
                                Parallels
                            </span>
                        </div>
                        <p className="text-primary-foreground/60 text-sm max-w-md leading-relaxed mb-6">
                            Ecommerce growth intelligence platform that unifies Meta, GA4, and Shopify data to help teams understand, optimise, and scale revenue with confidence.
                        </p>
                        <div className="flex gap-4">
                            {["Twitter", "LinkedIn"].map((social) => (
                                <a
                                    key={social}
                                    href="#"
                                    className="w-10 h-10 rounded-lg bg-primary-foreground/5 border border-primary-foreground/10 flex items-center justify-center text-primary-foreground/60 hover:text-primary-foreground hover:border-accent/30 transition-colors"
                                >
                                    <span className="text-xs font-medium">{social[0]}</span>
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Links */}
                    <div>
                        <h4 className="font-semibold text-primary-foreground mb-6">Product</h4>
                        <ul className="space-y-3">
                            {["Features", "Use Cases", "How It Works", "Pricing"].map((link) => (
                                <li key={link}>
                                    <a
                                        href={`#${link.toLowerCase().replace(/\s+/g, "-")}`}
                                        className="text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors flex items-center gap-1 group"
                                    >
                                        {link}
                                        <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold text-primary-foreground mb-6">Company</h4>
                        <ul className="space-y-3">
                            {["About", "Blog", "Careers", "Contact"].map((link) => (
                                <li key={link}>
                                    <a
                                        href="#"
                                        className="text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors flex items-center gap-1 group"
                                    >
                                        {link}
                                        <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="border-t border-primary-foreground/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-primary-foreground/50">
                        © {new Date().getFullYear()} Parallels. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6">
                        <a href="#" className="text-sm text-primary-foreground/50 hover:text-primary-foreground transition-colors">
                            Privacy Policy
                        </a>
                        <a href="#" className="text-sm text-primary-foreground/50 hover:text-primary-foreground transition-colors">
                            Terms of Service
                        </a>
                    </div>
                    <p className="text-sm text-primary-foreground/50">
                        A product by <span className="text-accent">Messold</span>
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default NewFooter;
