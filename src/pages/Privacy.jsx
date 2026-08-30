import LegalPage from "./LegalPage.jsx";

export default function Privacy() {
  return (
    <LegalPage
      section="legal"
      prefix="privacy"
      eyebrow="LEGAL"
      defaultHeading="Privacy Policy"
      slug="privacy"
      other="/terms"
    />
  );
}