import haikoLogo from "@/assets/haiko-logo.jpg";

export default function HaikoLogo({ className }: { className?: string }) {
  return (
    <img src={haikoLogo} alt="Haiko" className={className} style={{ height: 36, width: 'auto' }} />
  );
}
