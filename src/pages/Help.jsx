import { useState } from "react";
import { Link } from "react-router-dom";
import { showSuccess, showError, showInfo } from "../notify.jsx";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

const HELP_ITEMS = [
  {
    title: "What does PackPure do?",
    text: "PackPure is a prototype that checks packaged commodity labels for Legal Pack Pure compliance. Upload an image, and it extracts the label fields and runs compliance checks, then shows you whether each one passes.",
  },
  {
    title: "Which images can I scan?",
    text: "Upload or capture a clear JPG, JPEG or PNG of the product label. For best results keep the whole declaration area in frame, well lit, and not blurry.",
  },
  {
    title: "Do I need an account?",
    text: "You can view the scanner without an account, but you must log in or sign up to run a scan and save it to your history. Logging in also lets you access your dashboard, profile and settings.",
  },
  {
    title: "Where are my scans saved?",
    text: "Every scan you run is saved privately to your account under My Scans, and linked to your dashboard. Your scans are visible only to you.",
  },
  {
    title: "How do I change my password or profile?",
    text: "Open the user menu in the top-right, then choose Profile to edit your details or Settings to change your password.",
  },
  {
    title: "How do I report a product issue?",
    text: "While scanning a label, use the Write Complaint field in the upload section to describe your concern. It is saved alongside your scan and viewable in the scan details.",
  },
];

export default function Help() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: user?.fullName || "",
    email: user?.email || "",
    subject: "",
    message: "",
  });
  const [sending, setSending] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.message.trim()) {
      showInfo("Nothing to send", "Please write a message before submitting.");
      return;
    }
    setSending(true);
    try {
      await api.sendContact({
        name: form.name,
        email: form.email,
        subject: form.subject,
        message: form.message,
      });
      showSuccess("Message sent", "Your message has been sent. We will get back to you soon.", { id: "contact-sent" });
      setForm((prev) => ({ ...prev, subject: "", message: "" }));
    } catch (err) {
      showError("Could not send message", err.status === 401 ? "Please log in and try again." : "Please try again in a moment.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="pp-page">
      <section className="pp-page-hero">
        <span className="pp-eyebrow">HELP</span>
        <h1>How can we help?</h1>
        <p>
          Quick answers to common questions, or send us a message and our team
          will get back to you.
        </p>
      </section>

      <section className="pp-section">
        <div className="pp-help-list">
          {HELP_ITEMS.map((item) => (
            <div className="pp-help-item" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="pp-section">
        <div className="pp-section-head">
          <span className="pp-eyebrow">CONTACT SUPPORT</span>
          <h2>Write to us</h2>
          <p className="pp-section-sub">
            Have a question or found an issue? Fill in the form below and our
            support team will reply by email.
          </p>
        </div>

        <form className="pp-contact-form" onSubmit={handleSubmit}>
          <div className="pp-field-row">
            <div className="pp-field">
              <label htmlFor="contact-name">Name</label>
              <input
                id="contact-name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Your full name"
              />
            </div>
            <div className="pp-field">
              <label htmlFor="contact-email">Email</label>
              <input
                id="contact-email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="pp-field">
            <label htmlFor="contact-subject">Subject</label>
            <input
              id="contact-subject"
              name="subject"
              value={form.subject}
              onChange={handleChange}
              placeholder="What is this about? (optional)"
              maxLength="100"
            />
          </div>

          <div className="pp-field">
            <label htmlFor="contact-message">Message</label>
            <textarea
              id="contact-message"
              className="pp-field-textarea"
              name="message"
              rows="5"
              maxLength="2000"
              value={form.message}
              onChange={handleChange}
              placeholder="Describe your question or issue…"
              required
            />
          </div>

          <div className="pp-contact-actions">
            <button
              type="submit"
              className="pp-btn pp-btn-primary"
              disabled={sending}
            >
              {sending ? "Sending…" : "Send Message"}
            </button>
            <span className="pp-contact-note">
              {form.message.length}/2000 characters
            </span>
          </div>
        </form>
      </section>

      <section className="pp-cta">
        <h2>Want to learn more?</h2>
        <p>
          See how PackPure works from label to compliance report.
        </p>
        <div className="pp-hero-actions">
          <Link to="/how-it-works" className="pp-btn pp-btn-primary pp-btn-lg">
            How It Works
          </Link>
        </div>
      </section>
    </div>
  );
}
