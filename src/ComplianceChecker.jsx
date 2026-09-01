import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import "./App.css";
import {
  showSuccess,
  showError,
  showWarning,
  showInfo,
  showScan,
  showCompliance,
  dismissNotification,
} from "./notify.jsx";
import { api } from "./api.js";
import { useAuth } from "./auth.jsx";

/* =========================================================
   SAMPLE PRODUCTS
========================================================= */

const SAMPLE_PRODUCTS = [
  {
    id: 1,

    name: "Compliant Sample Product",

    category: "Packaged Beverage",

    status: "COMPLIANT",

    image: "/sample/1.png",

    extractedData: {
      commodityName: "Almond Milk",
      manufacturer:
        "Organic Naturals India Pvt. Ltd.",
      netQuantity: "1 L",
      mrp: "₹240",
      mrpDeclaration:
        "MRP ₹240 (incl. of all taxes)",
      manufacturingDate: "07/2026",
      consumerCare: "1800-123-4567",
      countryOfOrigin: "India",
    },

    checks: [
      {
        title: "Commodity Name",
        value: "Almond Milk",
        status: "pass",
        message: "Declaration detected.",
      },
      {
        title: "Manufacturer Details",
        value:
          "Organic Naturals India Pvt. Ltd.",
        status: "pass",
        message:
          "Manufacturer information detected.",
      },
      {
        title: "Net Quantity",
        value: "1 L",
        status: "pass",
        message:
          "Quantity declaration detected.",
      },
      {
        title: "MRP Declaration",
        value:
          "₹240 (incl. of all taxes)",
        status: "pass",
        message:
          "MRP declaration detected.",
      },
      {
        title: "Consumer Care",
        value: "1800-123-4567",
        status: "pass",
        message:
          "Consumer care information detected.",
      },
    ],
  },

  {
    id: 2,

    name: "Non-Compliant Sample Product",

    category: "Packaged Snacks",

    status: "NON-COMPLIANT",

    image: "/sample/2.png",

    extractedData: {
      commodityName:
        "Masala Potato Chips",
      manufacturer:
        "TastyBites Food Crafters Ltd.",
      netQuantity: "1 Packet",
      mrp: "₹50 + GST",
      mrpDeclaration: "MRP ₹50 + GST",
      manufacturingDate: "July 2026",
      consumerCare: "Not detected",
      countryOfOrigin: "India",
    },

    checks: [
      {
        title: "Commodity Name",
        value:
          "Masala Potato Chips",
        status: "pass",
        message: "Declaration detected.",
      },
      {
        title: "Manufacturer Details",
        value:
          "TastyBites Food Crafters Ltd.",
        status: "pass",
        message:
          "Manufacturer information detected.",
      },
      {
        title: "Net Quantity",
        value: "1 Packet",
        status: "fail",
        message:
          "Quantity declaration requires verification.",
      },
      {
        title: "MRP Declaration",
        value: "₹50 + GST",
        status: "fail",
        message:
          "MRP declaration requires verification.",
      },
      {
        title: "Consumer Care",
        value: "Not detected",
        status: "fail",
        message:
          "Consumer care information was not detected.",
      },
    ],
  },
];

/* =========================================================
   COMPONENT
========================================================= */

function ComplianceChecker() {
  const [selectedProduct, setSelectedProduct] =
    useState(null);

  const [uploadedImage, setUploadedImage] =
    useState(null);

  const [uploadedFileName, setUploadedFileName] =
    useState("");

  const [frontImage, setFrontImage] =
    useState(null);

  const [frontFileName, setFrontFileName] =
    useState("");

  const [backImage, setBackImage] =
    useState(null);

  const [backFileName, setBackFileName] =
    useState("");

  const [complaint, setComplaint] =
    useState("");

  const [isAnalyzing, setIsAnalyzing] =
    useState(false);

  const [isCameraOpen, setIsCameraOpen] =
    useState(false);

  const [cameraStream, setCameraStream] =
    useState(null);

  const [cameraError, setCameraError] =
    useState("");

  const [showAuthPrompt, setShowAuthPrompt] =
    useState(false);

  const fileInputRef = useRef(null);
  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const PENDING_KEY = "pp-pending-scan";

  useEffect(() => {
    const pending = window.sessionStorage.getItem(PENDING_KEY);
    if (pending) {
      try {
        const data = JSON.parse(pending);
        if (data?.image) {
          setUploadedImage(data.image);
          setUploadedFileName(data.fileName || "");
        }
      } catch {
        /* ignore malformed pending data */
      }
      window.sessionStorage.removeItem(PENDING_KEY);
    }
  }, []);

  const goLogin = async () => {
    await savePendingImage();
    setShowAuthPrompt(false);
    navigate("/login?redirect=/scanner&pending=scan");
  };

  const goSignup = async () => {
    await savePendingImage();
    setShowAuthPrompt(false);
    navigate("/signup?redirect=/scanner&pending=scan");
  };

  const savePendingImage = async () => {
    if (!uploadedImage) return;
    let image = uploadedImage;
    if (image.startsWith("blob:")) {
      try {
        const response = await fetch(image);
        const blob = await response.blob();
        image = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch {
        return;
      }
    }
    window.sessionStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ image, fileName: uploadedFileName })
    );
  };

  /* =======================================================
     CAMERA VIDEO
  ======================================================= */

  useEffect(() => {
    if (!cameraStream || !videoRef.current) {
      return;
    }

    const video = videoRef.current;

    video.srcObject = cameraStream;

    const playVideo = async () => {
      try {
        await video.play();
      } catch (error) {
        console.error(
          "Unable to start camera preview:",
          error
        );
      }
    };

    video.onloadedmetadata = playVideo;

    if (video.readyState >= 2) {
      playVideo();
    }

    return () => {
      video.onloadedmetadata = null;
    };
  }, [cameraStream]);

  /* =======================================================
     CLEANUP CAMERA
  ======================================================= */

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream
          .getTracks()
          .forEach((track) =>
            track.stop()
          );
      }
    };
  }, [cameraStream]);

  /* =======================================================
     IMAGE URL CLEANUP
  ======================================================= */

  useEffect(() => {
    return () => {
      [uploadedImage, frontImage, backImage].forEach(
        (img) => {
          if (img && img.startsWith("blob:")) {
            URL.revokeObjectURL(img);
          }
        }
      );
    };
  }, [uploadedImage, frontImage, backImage]);

  /* =======================================================
     UPLOAD
  ======================================================= */

  const handleUpload = (event, slot = "barcode") => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showError(
        "Unsupported file",
        "Please upload a JPG, JPEG or PNG image.",
        { id: "upload-type" }
      );

      event.target.value = "";

      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showError(
        "File too large",
        "Maximum allowed size is 10 MB per image.",
        { id: "upload-size" }
      );

      event.target.value = "";

      return;
    }

    showInfo("Image selected", `"${file.name}" is ready to scan.`, { id: `upload-${slot}` });

    const imageURL =
      URL.createObjectURL(file);

    if (slot === "front") {
      setFrontImage(imageURL);
      setFrontFileName(file.name);
    } else if (slot === "back") {
      setBackImage(imageURL);
      setBackFileName(file.name);
    } else {
      setUploadedImage(imageURL);
      setUploadedFileName(file.name);
    }

    setSelectedProduct(null);
    setIsAnalyzing(false);
  };

  const removeSlotImage = (slot) => {
    if (slot === "front") {
      setFrontImage(null);
      setFrontFileName("");
    } else if (slot === "back") {
      setBackImage(null);
      setBackFileName("");
    } else {
      setUploadedImage(null);
      setUploadedFileName("");
    }
  };


  /* =======================================================
     CAMERA
  ======================================================= */

  const openCamera = async () => {
    setCameraError("");

    if (!window.isSecureContext) {
      setCameraError(
        "Camera access requires HTTPS. Use your deployed HTTPS website on mobile."
      );

      setIsCameraOpen(true);

      return;
    }

    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setCameraError(
        "Camera access is not supported by this browser."
      );

      setIsCameraOpen(true);

      return;
    }

    try {
      if (cameraStream) {
        cameraStream
          .getTracks()
          .forEach((track) =>
            track.stop()
          );
      }

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            video: {
              facingMode: {
                ideal: "environment",
              },

              width: {
                ideal: 1920,
              },

              height: {
                ideal: 1080,
              },
            },

            audio: false,
          }
        );

      setCameraStream(stream);
      setIsCameraOpen(true);
      setSelectedProduct(null);
      setCameraError("");
    } catch (error) {
      console.error("Camera error:", error);

      let message =
        "Unable to access the camera.";

      if (
        error.name === "NotAllowedError"
      ) {
        message =
          "Camera permission was denied. Allow camera access and try again.";
      } else if (
        error.name === "NotFoundError"
      ) {
        message =
          "No camera was found on this device.";
      } else if (
        error.name === "NotReadableError"
      ) {
        message =
          "The camera is already being used by another application.";
      } else if (
        error.name === "SecurityError"
      ) {
        message =
          "Camera access was blocked for security reasons.";
      }

      setCameraError(message);
      setIsCameraOpen(true);
    }
  };

  /* =======================================================
     CLOSE CAMERA
  ======================================================= */

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream
        .getTracks()
        .forEach((track) =>
          track.stop()
        );
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraStream(null);
    setIsCameraOpen(false);
    setCameraError("");
  };

  /* =======================================================
     CAPTURE
  ======================================================= */

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      showError("Camera not ready", "Please try again in a moment.");
      return;
    }

    if (
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      showInfo(
        "Camera loading",
        "The camera is still loading. Please wait a moment."
      );
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context =
      canvas.getContext("2d");

    if (!context) {
      alert("Unable to capture image.");
      return;
    }

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const imageURL =
      canvas.toDataURL(
        "image/jpeg",
        0.9
      );

    setUploadedImage(imageURL);

    setUploadedFileName(
      `camera-scan-${Date.now()}.jpg`
    );

    setSelectedProduct(null);

    closeCamera();

    showInfo("Photo captured", "Label image captured. Ready to analyze.", { id: "scan-capture" });
  };

  /* =======================================================
     GALLERY
  ======================================================= */

  const useGallery = () => {
    closeCamera();

    setTimeout(() => {
      fileInputRef.current?.click();
    }, 120);
  };

  /* =======================================================
     SAMPLE
  ======================================================= */

  const handleSample = (product) => {
    setSelectedProduct(product);

    setUploadedImage(null);
    setUploadedFileName("");
    setFrontImage(null);
    setFrontFileName("");
    setBackImage(null);
    setBackFileName("");

    setIsAnalyzing(false);
  };

  /* =======================================================
     ANALYZE
  ======================================================= */

  const analyzeImage = () => {
    if (!uploadedImage) {
      showError(
        "No image selected",
        "Please upload or capture a product image first.",
        { id: "scan-nil" }
      );
      return;
    }

    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      showError(
        "Authentication required",
        "Please log in or create an account to scan this product.",
        { id: "scan-auth" }
      );
      return;
    }

    setIsAnalyzing(true);

    showScan("Scan started", "Analyzing product label…", {
      id: "scan-progress",
      duration: 60000,
    });

    /*
      TEMPORARY DEMO

      Replace this section later with:
      POST /api/analyze
    */

    setTimeout(async () => {
      setIsAnalyzing(false);

      const result = {
        ...SAMPLE_PRODUCTS[0],
        id: Date.now(),
        name: uploadedFileName || "Uploaded Product",
        category: "Uploaded Package",
        image: uploadedImage,
        frontImage: frontImage || "",
        backImage: backImage || "",
      };

      setSelectedProduct(result);

      const failed = (result.checks || []).filter(
        (c) => c.status === "fail"
      ).length;

      dismissNotification("scan-progress");

      const scrollToResult = () =>
        requestAnimationFrame(() => {
          document
            .querySelector(".result-section")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        });

      if (failed === 0) {
        showSuccess(
          "Scan completed",
          "Compliance check completed — no issues found.",
          { id: "scan-success", action: { label: "View Results", onClick: scrollToResult } }
        );
      } else {
        showCompliance(
          "Compliance issues detected",
          `${failed} issue${failed === 1 ? "" : "s"} found. Review the scan results.`,
          { id: "scan-issues", duration: 10000, action: { label: "View Results", onClick: scrollToResult } }
        );
      }

      try {
        const data = await api.createScan({
          productName: result.name,
          image: result.image || "",
          extractedData: {
            ...(result.extractedData || {}),
            frontImage: frontImage || "",
            backImage: backImage || "",
            complaint: complaint.trim() || "",
          },
          checks: result.checks || [],
          status: result.status || "COMPLIANT",
        });
        if (data?.scan?.id) {
          const scanId = data.scan.id;
          showSuccess("Scan saved", "Scan saved to My Scans.", {
            id: "scan-saved",
            action: {
              label: "View Scan",
              onClick: () => navigate(`/my-scans/${scanId}`),
            },
          });
        }
      } catch (err) {
        console.error("Failed to save scan:", err);
        showWarning(
          "Scan couldn't be saved",
          "Analysis completed, but the result could not be saved to your history."
        );
      }
    }, 1800);
  };

  /* =======================================================
     RESET
  ======================================================= */

  const resetScanner = () => {
    closeCamera();

    setSelectedProduct(null);
    setUploadedImage(null);
    setUploadedFileName("");
    setFrontImage(null);
    setFrontFileName("");
    setBackImage(null);
    setBackFileName("");
    setComplaint("");
    setIsAnalyzing(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /* =======================================================
     RESULT
  ======================================================= */

  const renderScanner = () => {
    const image =
      uploadedImage ||
      selectedProduct?.image;

    if (selectedProduct) {
      const failedChecks =
        selectedProduct.checks.filter(
          (check) =>
            check.status === "fail"
        );

      const passedChecks =
        selectedProduct.checks.length -
        failedChecks.length;

      const isCompliant =
        failedChecks.length === 0;

      return (
        <section className="result-section">
          <div className="result-header">
            <div>
              <span className="eyebrow">
                ANALYSIS RESULT
              </span>

              <h1>
                Compliance Report
              </h1>

              <p>
                Review extracted information
                and detected rule checks.
              </p>
            </div>

            <div
              className={
                isCompliant
                  ? "status-badge success"
                  : "status-badge danger"
              }
            >
              {isCompliant
                ? "✓ COMPLIANT"
                : "✕ NON-COMPLIANT"}
            </div>
          </div>

          <div className="result-grid">
            {/* Image */}
            <div className="result-image-card">
              <div className="result-image-wrap">
                {image ? (
                  <img
                    src={image}
                    alt="Scanned product"
                  />
                ) : (
                  <div className="image-placeholder">
                    Image not available
                  </div>
                )}
              </div>

              <button
                className="secondary-btn full-width"
                onClick={resetScanner}
              >
                ← Scan Another Product
              </button>
            </div>

            {/* Data */}
            <div className="result-info-card">
              <div className="result-summary">
                <div>
                  <span>
                    Checks Passed
                  </span>

                  <strong>
                    {passedChecks}
                  </strong>
                </div>

                <div>
                  <span>
                    Issues Found
                  </span>

                  <strong
                    className={
                      failedChecks.length
                        ? "danger-text"
                        : ""
                    }
                  >
                    {failedChecks.length}
                  </strong>
                </div>
              </div>

              <div className="card-heading">
                <span className="eyebrow">
                  OCR EXTRACTION
                </span>

                <h2>
                  Detected Information
                </h2>
              </div>

              <div className="data-list">
                <DataRow
                  label="Commodity"
                  value={
                    selectedProduct
                      .extractedData
                      ?.commodityName
                  }
                />

                <DataRow
                  label="Manufacturer"
                  value={
                    selectedProduct
                      .extractedData
                      ?.manufacturer
                  }
                />

                <DataRow
                  label="Net Quantity"
                  value={
                    selectedProduct
                      .extractedData
                      ?.netQuantity
                  }
                />

                <DataRow
                  label="MRP"
                  value={
                    selectedProduct
                      .extractedData
                      ?.mrpDeclaration
                  }
                />

                <DataRow
                  label="Manufacturing"
                  value={
                    selectedProduct
                      .extractedData
                      ?.manufacturingDate
                  }
                />

                <DataRow
                  label="Consumer Care"
                  value={
                    selectedProduct
                      .extractedData
                      ?.consumerCare
                  }
                />

                <DataRow
                  label="Country"
                  value={
                    selectedProduct
                      .extractedData
                      ?.countryOfOrigin
                  }
                />
              </div>
            </div>
          </div>

          {/* Checks */}
          <div className="checks-card">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  RULE CHECKS
                </span>

                <h2>
                  Compliance Verification
                </h2>

                <p>
                  Each declaration is evaluated
                  against the configured rules.
                </p>
              </div>
            </div>

            <div className="check-list">
              {selectedProduct.checks.map(
                (check, index) => (
                  <div
                    className={`check-item ${
                      check.status === "pass"
                        ? "check-pass"
                        : "check-fail"
                    }`}
                    key={index}
                  >
                    <div className="check-icon">
                      {check.status ===
                      "pass"
                        ? "✓"
                        : "!"}
                    </div>

                    <div className="check-content">
                      <div className="check-title-row">
                        <h3>
                          {check.title}
                        </h3>

                        <span>
                          {check.status ===
                          "pass"
                            ? "PASS"
                            : "REVIEW"}
                        </span>
                      </div>

                      <p className="detected-value">
                        Detected:{" "}
                        <strong>
                          {check.value}
                        </strong>
                      </p>

                      <p>
                        {check.message}
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </section>
      );
    }

    /* =====================================================
       SCANNER HOME
    ===================================================== */

    return (
      <>
        <section className="hero">
          <div className="hero-copy">
            <span className="hero-badge">
              <span className="live-dot" />
              AI-ASSISTED LEGAL PACK PURE
            </span>

            <h1>
              Verify product labels
              <span>
                before they reach consumers.
              </span>
            </h1>

            <p>
              Upload a packaged commodity label
              and analyze its declarations against
              configurable Legal Pack Pure checks.
            </p>
          </div>

          <div className="hero-stat">
            <strong>AI</strong>
            <span>LABEL ANALYSIS</span>
          </div>
        </section>

        {/* Upload */}
        <section className="upload-card">
          <div className="upload-top">
            <div className="upload-icon">
              <span>↑</span>
            </div>

            <div>
              <span className="eyebrow">
                INPUT
              </span>

              <h2>
                Scan Product Label
              </h2>

              <p>
                Upload a clear package image
                for OCR and compliance analysis.
              </p>
            </div>
          </div>

          {/* Barcode (required) */}
          <div className="upload-slot">
            <div className="upload-slot-head">
              <span className="upload-slot-label">
                Product Barcode
              </span>
              <span className="upload-slot-req">
                Required
              </span>
            </div>

            <div className="upload-slot-body">
              {uploadedImage ? (
                <div className="slot-image">
                  <img
                    src={uploadedImage}
                    alt="Product barcode"
                  />
                  <button
                    className="slot-remove"
                    onClick={() =>
                      removeSlotImage("barcode")
                    }
                    title="Remove barcode image"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="slot-empty">
                  <button
                    className="primary-btn"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                  >
                    <span>↑</span>
                    Upload Barcode
                  </button>
                  <button
                    className="camera-btn"
                    onClick={openCamera}
                  >
                    <span>⌾</span>
                    Use Camera
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Front (optional) */}
          <div className="upload-slot">
            <div className="upload-slot-head">
              <span className="upload-slot-label">
                Product Front
              </span>
              <span className="upload-slot-opt">
                Optional
              </span>
            </div>

            <div className="upload-slot-body">
              {frontImage ? (
                <div className="slot-image">
                  <img
                    src={frontImage}
                    alt="Product front"
                  />
                  <button
                    className="slot-remove"
                    onClick={() =>
                      removeSlotImage("front")
                    }
                    title="Remove front image"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="slot-empty">
                  <button
                    className="secondary-btn"
                    onClick={() =>
                      frontInputRef.current?.click()
                    }
                  >
                    <span>↑</span>
                    Add Front
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Back (optional) */}
          <div className="upload-slot">
            <div className="upload-slot-head">
              <span className="upload-slot-label">
                Product Back
              </span>
              <span className="upload-slot-opt">
                Optional
              </span>
            </div>

            <div className="upload-slot-body">
              {backImage ? (
                <div className="slot-image">
                  <img
                    src={backImage}
                    alt="Product back"
                  />
                  <button
                    className="slot-remove"
                    onClick={() =>
                      removeSlotImage("back")
                    }
                    title="Remove back image"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="slot-empty">
                  <button
                    className="secondary-btn"
                    onClick={() =>
                      backInputRef.current?.click()
                    }
                  >
                    <span>↑</span>
                    Add Back
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Complaint (optional) */}
          <div className="upload-slot">
            <div className="upload-slot-head">
              <span className="upload-slot-label">
                Write Complaint
              </span>
              <span className="upload-slot-opt">
                Optional
              </span>
            </div>

            <div className="upload-slot-body">
              <textarea
                className="complaint-textarea"
                rows="3"
                maxLength="500"
                placeholder="Describe your complaint about this product, e.g. missing MRP, wrong net quantity, misleading claims…"
                value={complaint}
                onChange={(e) =>
                  setComplaint(e.target.value)
                }
              />
              <span className="complaint-hint">
                {complaint.length}/500 characters — saved with
                your scan
              </span>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={(e) => handleUpload(e, "barcode")}
            hidden
          />
          <input
            ref={backInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={(e) => handleUpload(e, "back")}
            hidden
          />
          <input
            ref={frontInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={(e) => handleUpload(e, "front")}
            hidden
          />
          <div className="upload-meta">
            JPG, JPEG or PNG
            <span />
            Maximum 10 MB per image
          </div>

          {uploadedImage && (
            <div className="uploaded-preview">
              <div className="preview-actions slot-ready">
                <div>
                  <strong>
                    {uploadedFileName || "Barcode image"}
                  </strong>

                  <span>
                    Barcode ready — barcode is required, front &
                    back are optional
                  </span>
                </div>

                <button
                  className="primary-btn"
                  onClick={analyzeImage}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing
                    ? "Analyzing..."
                    : "Analyze Compliance →"}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Samples */}
        <section className="samples-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                DEMO MODE
              </span>

              <h2>
                Try sample products
              </h2>

              <p>
                Test the compliance workflow
                before connecting the OCR backend.
              </p>
            </div>
          </div>

          <div className="sample-grid">
            {SAMPLE_PRODUCTS.map(
              (product) => (
                <article
                  className="sample-card"
                  key={product.id}
                >
                  <div className="sample-image">
                    <img
                      src={product.image}
                      alt={product.name}
                      onError={(event) => {
                        event.currentTarget.style.display =
                          "none";
                      }}
                    />

                    <span
                      className={
                        product.status ===
                        "COMPLIANT"
                          ? "sample-status pass"
                          : "sample-status fail"
                      }
                    >
                      {product.status}
                    </span>
                  </div>

                  <div className="sample-content">
                    <span className="category">
                      {product.category}
                    </span>

                    <h3>
                      {product.name}
                    </h3>

                    <button
                      className="view-btn"
                      onClick={() =>
                        handleSample(product)
                      }
                    >
                      View Analysis
                      <span>→</span>
                    </button>
                  </div>
                </article>
              )
            )}
          </div>
        </section>
      </>
    );
  };

  /* =======================================================
     MAIN
  ======================================================= */

  return (
    <div className="app">
      <main className="main">
        {renderScanner()}
      </main>

      {/* =====================================================
          CAMERA MODAL
      ===================================================== */}

      {isCameraOpen && (
        <div className="camera-overlay">
          <div className="camera-modal">
            <div className="camera-header">
              <div>
                <span className="eyebrow">
                  CAMERA SCANNER
                </span>

                <h2>
                  Scan Product Label
                </h2>
              </div>

              <button
                className="camera-close"
                onClick={closeCamera}
                aria-label="Close camera"
              >
                ×
              </button>
            </div>

            {cameraError ? (
              <div className="camera-error">
                <div className="camera-error-icon">
                  !
                </div>

                <h3>
                  Camera unavailable
                </h3>

                <p>
                  {cameraError}
                </p>

                <button
                  className="primary-btn"
                  onClick={useGallery}
                >
                  📁 Use Gallery
                </button>

                <button
                  className="secondary-btn"
                  onClick={closeCamera}
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="camera-preview">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                  />

                  <div className="scan-frame">
                    <div className="corner top-left" />
                    <div className="corner top-right" />
                    <div className="corner bottom-left" />
                    <div className="corner bottom-right" />

                    <div className="scan-line" />
                  </div>

                  <div className="camera-hint">
                    Align the product label
                    inside the frame
                  </div>
                </div>

                <div className="camera-controls">
                  <button
                    className="secondary-btn"
                    onClick={closeCamera}
                  >
                    Cancel
                  </button>

                  <button
                    className="capture-btn"
                    onClick={capturePhoto}
                    disabled={!cameraStream}
                  >
                    <span>●</span>
                    Capture
                  </button>
                </div>

                <button
                  className="camera-upload-fallback"
                  onClick={useGallery}
                >
                  📁 Use Gallery Instead
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        style={{ display: "none" }}
      />

      {/* =====================================================
          AUTH REQUIRED PROMPT
      ===================================================== */}

      {showAuthPrompt && (
        <div className="camera-overlay">
          <div className="auth-modal">
            <div className="auth-modal-head">
              <span className="eyebrow">LOGIN REQUIRED</span>
              <h2>Authentication required</h2>
              <p>
                Please create an account or log in to analyze your
                product label.
              </p>
            </div>

            <div className="auth-modal-actions">
              <button
                className="primary-btn auth-modal-btn"
                onClick={goLogin}
              >
                Login
              </button>
              <button
                className="secondary-btn auth-modal-btn"
                onClick={goSignup}
              >
                Sign Up
              </button>
            </div>

            <p className="auth-modal-note">
              Your selected image will be kept and used once you are
              signed in.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   DATA ROW
========================================================= */

function DataRow({ label, value }) {
  return (
    <div className="data-row">
      <span>{label}</span>

      <strong>
        {value || "Not detected"}
      </strong>
    </div>
  );
}

export default ComplianceChecker;