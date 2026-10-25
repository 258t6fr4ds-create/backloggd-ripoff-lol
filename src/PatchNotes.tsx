import { BookOpen, CheckCircle2, Sparkles, X } from 'lucide-react';
import { APP_VERSION, RELEASE_NOTES } from './releaseNotes';

export default function PatchNotes({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="modal patchnotes-modal" role="dialog" aria-modal="true" aria-label="GameVault patch notes">
        <header className="modal-heading">
          <div><span className="eyebrow">THE UPDATE LOG</span><h2>What's new</h2></div>
          <button className="icon-btn" onClick={onClose} aria-label="Close patch notes"><X size={20}/></button>
        </header>
        <div className="patchnotes-content">
          <div className="release-hero">
            <span className="release-hero-icon"><Sparkles size={21}/></span>
            <div><span className="eyebrow">CURRENT VERSION</span><h3>GameVault v{APP_VERSION}</h3><p>All improvements, additions and bug fixes — documented in one place.</p></div>
          </div>
          <div className="release-timeline">
            {RELEASE_NOTES.map((release, index) => (
              <article className="release-entry" key={release.version}>
                <div className="release-entry-heading">
                  <div><span className="release-version">v{release.version}</span>{index === 0 && <span className="release-latest">Latest</span>}<h3>{release.title}</h3></div>
                  <time dateTime={release.date}>{new Date(release.date + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</time>
                </div>
                <p className="release-summary">{release.summary}</p>
                <ul className="release-changes">
                  {release.changes.map((change, i) => <li key={i}><CheckCircle2 size={15}/><div><span className={'release-kind release-' + change.type.toLowerCase()}>{change.type}</span><span>{change.text}</span></div></li>)}
                </ul>
              </article>
            ))}
          </div>
          <div className="release-ending"><BookOpen size={17}/><span>These notes are saved in the app and in the project's GitHub CHANGELOG.md.</span></div>
        </div>
      </section>
    </div>
  );
}
