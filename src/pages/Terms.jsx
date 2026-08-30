import LegalPage from "./LegalPage.jsx";

export default function Terms() {
  return (
    <LegalPage
      section="legal"
      prefix="terms"
      eyebrow="LEGAL"
      defaultHeading="Terms & Services"
      slug="terms"
      other="/privacy"
    />
  );
}