import type { LegalDocument } from '@/data/legal'

export function LegalDocumentView({ document }: { document: LegalDocument }) {
  return (
    <div className="page">
      <article className="legalDoc">
        <header className="legalDocHeader">
          <h1 className="display">{document.title}</h1>
          <p className="legalRevision">{document.revisionLabel}</p>
          <p className="legalDisclaimer">{document.disclaimer}</p>
        </header>
        {document.sections.map((section) => (
          <section key={section.heading} className="legalSection">
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </section>
        ))}
      </article>
    </div>
  )
}
