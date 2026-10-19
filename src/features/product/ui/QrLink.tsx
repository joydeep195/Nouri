import { ExternalLink, Link, ScanBarcode, ScanText, ShieldAlert } from 'lucide-react';
import { toSafeExternalUrl } from '@/shared/lib/safeUrl';
import { TopBar } from '@/shared/ui/TopBar';

interface QrLinkProps {
  url?: string | undefined;
  text?: string | undefined;
  onBack: () => void;
  onLabel: () => void;
  onRescan: () => void;
}

/** Shown when a QR code holds a web link or text instead of a product barcode. */
export default function QrLink({ url, text, onBack, onLabel, onRescan }: QrLinkProps) {
  const safe = toSafeExternalUrl(url);
  const host = safe?.hostname.replace(/^www\./, '');
  const unsafeLink = !!url && !safe;

  return (
    <main className="screen has-bar">
      <TopBar onBack={onBack} />
      <div className="state" style={{ minHeight: '64dvh' }}>
        <div className={`state-icon ${unsafeLink ? 'warn' : ''}`}>
          {unsafeLink ? <ShieldAlert size={36} /> : <Link size={36} />}
        </div>
        <h2>{url ? 'This QR code opens a website' : "This code isn't a product"}</h2>
        <span className="code-chip">{host ?? (url ? 'Not a secure link' : (text ?? '').slice(0, 40))}</span>
        <p>
          It doesn&apos;t carry a product barcode, so we can&apos;t score it directly. Scan the regular barcode on the
          pack, or read the ingredients label.
          {unsafeLink && ' The link is not secure (https), so we won’t open it.'}
        </p>
        <div className="btn-row">
          <button type="button" className="btn btn-primary" onClick={onRescan}>
            <ScanBarcode size={20} /> Scan the barcode instead
          </button>
          <button type="button" className="btn btn-secondary" onClick={onLabel}>
            <ScanText size={20} /> Read the label
          </button>
          {safe && (
            <a
              className="btn btn-ghost"
              href={safe.href}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
            >
              <ExternalLink size={18} /> Open {host}
            </a>
          )}
        </div>
      </div>
    </main>
  );
}
