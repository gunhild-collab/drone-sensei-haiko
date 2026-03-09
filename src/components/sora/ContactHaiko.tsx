import { useState } from "react";
import { MessageCircle, X, ExternalLink } from "lucide-react";

interface Props {
  prominent?: boolean;
}

export default function ContactHaiko({ prominent }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed z-50 flex items-center gap-2 rounded-full shadow-lg transition-all hover:scale-105 ${
          prominent
            ? 'bottom-24 right-6 bg-sora-pink text-sora-text px-5 py-3'
            : 'bottom-24 right-6 bg-sora-surface border border-sora-border text-sora-text-muted px-4 py-2.5'
        }`}
      >
        <MessageCircle className="w-4 h-4" />
        <span className="text-sm font-medium">Trenger du hjelp?</span>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-sora-surface border border-sora-border rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-sora-text-dim hover:text-sora-text">
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-sora-text mb-1">Kontakt Haiko</h3>
              <p className="text-sora-text-muted text-sm">
                Vi hjelper deg med regulatoriske søknader, SORA-prosesser og operasjonsoppsett.
              </p>
            </div>

            <div className="space-y-3">
              <ContactItem label="Gunhild" email="gunhild@haiko.no" />
              <ContactItem label="Simen" email="simen@haiko.no" />
            </div>

            <a
              href="https://haiko.no"
              target="_blank"
              rel="noopener"
              className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-sora-pink to-sora-purple text-white font-medium text-sm hover:opacity-90 transition-all"
            >
              Besøk haiko.no <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}
    </>
  );
}

function ContactItem({ label, email }: { label: string; email: string }) {
  return (
    <a
      href={`mailto:${email}`}
      className="flex items-center justify-between bg-sora-bg rounded-lg px-4 py-3 hover:bg-sora-surface-hover transition-colors"
    >
      <span className="text-sora-text font-medium text-sm">{label}</span>
      <span className="text-sora-purple text-sm">{email}</span>
    </a>
  );
}
