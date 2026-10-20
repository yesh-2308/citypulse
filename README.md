# CityPulse 🌆

### Urban Infrastructure Risk Intelligence and Budget Optimization

CityPulse is a software-based urban infrastructure analysis prototype designed to help explore infrastructure risks, identify potential cascading failures, and prioritize maintenance actions under budget constraints.

## 🎯 Project Objectives

- Visualize available urban infrastructure and geographic datasets.
- Explore infrastructure risk indicators.
- Analyze potential relationships between infrastructure failures.
- Support budget-aware maintenance prioritization.
- Test hypothetical scenarios through a What-If Simulator.
- Make data sources, assumptions, and limitations transparent.

## ✨ Key Features

### 1. Infrastructure Map
Explore available geographic infrastructure information using an interactive map.

### 2. Risk Intelligence
Examine risk indicators derived from available data and analytical rules.

### 3. Cascade Analysis
Explore possible connections between infrastructure problems and their downstream impacts.

### 4. Budget Optimizer
Investigate maintenance priorities under budget constraints.

### 5. What-If Simulator
Experiment with hypothetical scenarios to understand how changing assumptions may affect results.

### 6. Data Methodology
Review data sources, assumptions, and limitations used by the application.

## 🛠️ Technology Stack

- **Frontend:** React and Vite
- **Backend:** Python and FastAPI
- **Data formats:** CSV, KML, and GeoJSON

## 📁 Project Structure

```text
citypulse/
├── backend/       # API and analysis engines
├── data/          # Geographic datasets and data files
├── frontend/      # React web application
└── README.md      # Project documentation
```

## 🚀 Getting Started

### Prerequisites

- Python installed
- Node.js and npm installed

### Run the Backend

From the project root, run:

```bash
python -m pip install fastapi uvicorn
python -m uvicorn backend.main:app --reload --port 8000
```

Keep this terminal running.

### Run the Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite in your browser.

**Note:** These are basic startup instructions. Additional Python packages, environment configuration, or external map services may be required depending on the project's implementation.

## 📊 Data Transparency

CityPulse uses available geographic and infrastructure datasets in supported formats, including CSV, KML, and GeoJSON.

Results depend on dataset coverage, quality, and the assumptions used by the analysis engines. Simulated or assumed values must not be interpreted as measured real-world conditions.

Risk indicators, cascade scenarios, and simulation outputs are exploratory prototype results, not validated forecasts or guarantees of real-world outcomes.

## 🔭 Project Status

Hackathon prototype under development.

## 📄 License

No license has been specified yet. All rights are reserved by default unless a license is added.
