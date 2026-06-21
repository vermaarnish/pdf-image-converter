# ConvertPDF - PDF & Image Converter

A secure, high-performance, and visually stunning full-stack web application that provides bidirectional file conversion: converting PDF documents into high-quality JPEG images, and compiling multiple JPEG/PNG images into a single standard PDF document.

**🔗 Live Demo:** [https://pdf-image-converter-gt91.onrender.com/](https://pdf-image-converter-gt91.onrender.com/)

---

## ✨ Features

- **Bidirectional Conversion**:
  - **PDF to Image**: Extracts pages from any PDF document and packages them into a download-ready `.zip` archive of 150 DPI JPEG images.
  - **Image to PDF**: Bundles multiple uploaded images (JPEG, JPG, PNG) into a single unified, clean PDF document.
- **Local & Secure Processing**: All files are processed directly on your backend server. No third-party APIs or cloud extraction services are used, ensuring total privacy.
- **Premium User Experience**: Designed with a sleek, modern glassmorphic UI, responsive layouts for mobile and desktop, drag-and-drop file zones, upload lists, and smooth state micro-animations.
- **Dynamic File Handling**: Configured to support file uploads of up to 50MB.

---

## 🛠️ Technology Stack

- **Frontend**:
  - React 18
  - Vite (Fast development server & build tool)
  - Vanilla CSS3 (Custom design system, glassmorphism, responsive grid, dynamic loaders)
- **Backend**:
  - Spring Boot 3.2.5
  - Java 17 / 21
  - Apache PDFBox 3.0.2 (Robust, high-fidelity PDF rendering and creation library)
- **Deployment & DevOps**:
  - Docker (Multi-stage build context)
  - Render Blueprint (`render.yaml`)

---

## 📁 Repository Structure

```
├── backend/                  # Spring Boot Java application
│   ├── src/                  # Java source files & resources
│   ├── pom.xml               # Maven configuration & dependencies
│   └── maven/                # Local Maven executable resources
├── frontend/                 # React Vite frontend application
│   ├── src/                  # React components & CSS styling
│   ├── index.html            # Entry point
│   ├── package.json          # Node.js configuration & scripts
│   └── vite.config.js        # Vite compiler & development proxy settings
├── Dockerfile                # Multi-stage Docker deployment definition
├── .dockerignore             # Optimizations for Docker building context
├── .gitignore                # Git exclusions
├── render.yaml               # Render.com auto-deploy Blueprint
└── README.md                 # Project documentation
```

---

## 🚀 Running Locally

### Prerequisites
- Java 17 or higher
- Node.js (v20+ recommended)

### Quick Start: Monolithic Mode (Recommended)
You can run the frontend and backend together on a single port (8080) just like in production:

1. Open PowerShell in the root directory.
2. Run the automation script:
   ```powershell
   Set-ExecutionPolicy Bypass -Scope Process
   .\build_and_run.ps1
   ```
3. Open your browser and navigate to `http://localhost:8080/`.

---

### Alternative: Development Mode (Separate Servers)

For quick development updates with hot-reload enabled:

#### 1. Start the Spring Boot Backend
```bash
cd backend
mvn spring-boot:run
```
*The backend API server will run on `http://localhost:8080`.*

#### 2. Start the React Frontend
```bash
cd frontend
npm install
npm run dev
```
*The Vite frontend server will run on `http://localhost:5173`. Any requests to `/api` are automatically proxied to the backend server.*

---

## ☁️ Deploying Online

This repository is optimized for quick, one-click hosting using its unified Docker configuration.

### Deploy to Render
1. Create a free account on [Render](https://render.com).
2. Create a new **Blueprint Instance** (or go to [https://render.com/deploy](https://render.com/deploy) and point to your GitHub repository).
3. Render will read `render.yaml`, set up the container environment, build the frontend and backend, and host your live website automatically!
