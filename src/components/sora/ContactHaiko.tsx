import { useState } from "react";
import { MessageCircle, X, ExternalLink } from "lucide-react";

interface Props {
  prominent?: boolean;
}

export default function ContactHaiko({ prominent }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`fixed z-50 flex items-center gap-2 rounded-full transition-all hover:scale-105 font-sora ${
          prominent
            ? 'bottom-24 right-6 haiko-btn-primary px-5 py-3 text-sm'
            : 'bottom-24 right-6 haiko-btn-secondary px-4 py-2.5 text-sm shadow-lg'
        }`}
      >
        <MessageCircle className="w-4 h-4" strokeWidth={1.5} />
        <span className="font-medium">Trenger du hjelp?</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative haiko-card p-6 max-w-md w-full shadow-2xl">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-sora-text-dim hover:text-sora-text">
              <X className="w-5 h-5" strokeWidth={1.5} />
            </button>

            <div className="text-center mb-6">
              <h3 className="text-[20px] font-display font-bold text-sora-text mb-1">Kontakt Haiko</h3>
              <p className="text-sora-text-muted text-[15px] font-sora">
                Vi hjelper deg med regulatoriske søknader, SORA-prosesser og operasjonsoppsett.
              </p>
            </div>

            <div className="space-y-3">
              <ContactItem label="Gunhild" email="gunhild@haiko.no" />
              <ContactItem label="Simen" email="simen@haiko.no" />
            </div>

            <a href="https://haiko.no" target="_blank" rel="noopener" className="mt-5 w-full haiko-btn-primary text-sm">
              Besøk haiko.no <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
            </a>
          </div>
        </div>
      )}
    </>
  );
}

function ContactItem({ label, email }: { label: string; email: string }) {
  return (
    <a href={`mailto:${email}`} className="flex items-center justify-between bg-sora-light rounded-lg px-4 py-3 hover:bg-sora-surface-hover transition-colors">
      <span className="text-sora-text font-medium text-sm font-sora">{label}</span>
      <span className="text-sora-purple text-sm font-sora">{email}</span>
    </a>
  );
}
