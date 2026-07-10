#  RehabCare – Rehabilitation Center Management System

##  Overview
**RehabCare** is a web-based **Rehabilitation Center Management System** designed to enhance efficiency, accuracy, and patient experience in rehabilitation facilities.  
The system enables **secure access** for administrators, clinical staff, and patients while integrating **AI-driven insights** and **DICOM image visualization** to support clinical decision-making and therapy tracking.

---

##  System Features

### a) User Authentication and Authorization
- Secure login for administrators, clinical staff, and patients.  
- Role-based access control ensuring appropriate permissions and data privacy.  

### b) Patient Portal
- Patient registration and profile management.  
- Appointment scheduling and management.  
- Access to medical history, prescriptions, and treatment plans.  
- Billing and payment history access for patients.

### c) Appointment Management
- Efficient scheduling and tracking of appointments for clinical staff.  
- Real-time updates and notifications for appointment confirmations and cancellations.

### d) Billing and Invoicing
- Automated generation of invoices and payment records.  
- Integration with patient and treatment data for accurate billing.

### e) Reporting and Analytics
- Generate reports for system usage, patient demographics, and financial insights.  
- Interactive data visualization dashboards for administrators.

### f) CDSS Integration for Radiology and Therapy Insights
- Integration of a **Clinical Decision Support System (CDSS)** module to analyze DICOM images and therapy data.  
- Uses **PyTorch** and **SimpleITK** for machine learning–based analysis and progress prediction.  
- Outputs actionable insights to assist clinicians in evaluating recovery progress.

### g) DICOM Viewer
- Interactive DICOM viewer supporting zoom, pan, rotate, and contrast adjustments.  
- **Multiplanar Reconstruction (MPR)** to view images in axial, sagittal, and coronal planes.  
- **3D Volume Rendering** for detailed anatomical visualization.  
- Image enhancement tools including windowing, leveling, smoothing, and noise reduction.

---

##  Technology Stack

| Layer | Tools / Technologies |
|-------|----------------------|
| **Frontend** | Node.js |
| **Backend** | Flask (Python) |
| **Database** | PostgreSQL |
| **Libraries / Frameworks** | PyDICOM, SimpleITK, PyTorch |
| **Languages** | Python, JavaScript |
| **IDE** | Visual Studio Code |
| **Version Control** | Git |
| **Project Management Methodology** | Agile |

---

##  Code Style 

- **Python:** Follows **PEP8** style guide.
- **JavaScript:** Uses ESLint-compatible formatting.
- Maximum line length: **80 characters**.
- Related code blocks grouped and separated by blank lines for clarity.
- Descriptive variable and function names for self-explanatory code.

###  Naming Conventions
| Element | Convention|
|----------|-------------|
| Variables & Functions | `camelCase` | 
| Classes | `PascalCase` | 
| Constants | `UPPER_CASE` |

###  Error Handling
- All critical operations wrapped in `try-except` blocks.  
- Meaningful error messages and logging for debugging and traceability.  

---

##  Team members 

Nada Mohamed El-Basel  
Farha El-Sayed  
Karim Ebrahim  
Adham Mahran  
Moustafa Moussa  
Mohamed Ramy  

---

##  Documentation  

- **Code Documentation:** Inline comments and docstrings for all modules.  
- **Database Schema:** ER diagram and table definitions.  


---


##  Conclusion
**RehabCare** aims to revolutionize rehabilitation management by merging healthcare operations, intelligent analytics, and interactive visualization into one unified system.  
It supports clinical efficiency, improves patient engagement, and ensures secure, data-driven rehabilitation care.

---
