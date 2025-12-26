//import React, { useEffect, useState } from "react";
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import "./AdminAnalytics.css";
import { Line, Bar, Pie, Doughnut } from "react-chartjs-2";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import Papa from "papaparse";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function AdminAnalytics() {
  const [overview, setOverview] = useState({});
  const [appointmentData, setAppointmentData] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [doctorPerf, setDoctorPerf] = useState([]);
  const [patientStats, setPatientStats] = useState({});
  const [loading, setLoading] = useState(true);
  //const [systemPerf, setSystemPerf] = useState(null);
  const analyticsRef = useRef(null);
  

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      //const [overview, appts, revenue, doctors, patients, system] = await Promise.all([
      const [overview, appts, revenue, doctors, patients] = await Promise.all([
        axios.get("http://localhost:5000/api/admin/analytics/overview"),
        axios.get("http://localhost:5000/api/admin/analytics/appointments-by-month"),
        axios.get("http://localhost:5000/api/admin/analytics/revenue-by-month"),
        axios.get("http://localhost:5000/api/admin/analytics/doctor-performance"),
        axios.get("http://localhost:5000/api/admin/analytics/patient-statistics")
        //axios.get("http://localhost:5000/api/admin/analytics/system-performance")
      ]);

      setOverview(overview.data);
      setAppointmentData(appts.data);
      setRevenueData(revenue.data);
      setDoctorPerf(doctors.data);
      setPatientStats(patients.data);
      //setSystemPerf(system.data);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setLoading(false);
    }
  };


// // Chart data for appointments trend (Line chart)
//   const appointmentChartData = {
//     labels: appointmentData.map((item) => item.month).reverse(),
//     datasets: [
//       {
//         label: "Total Appointments",
//         data: appointmentData.map((item) => item.total).reverse(),
//         borderColor: "#667eea",
//         backgroundColor: "rgba(102, 126, 234, 0.1)",
//         tension: 0.4,
//         fill: true,
//       },
//       {
//         label: "Completed",
//         data: appointmentData.map((item) => item.completed).reverse(),
//         borderColor: "#28a745",
//         backgroundColor: "rgba(40, 167, 69, 0.1)",
//         tension: 0.4,
//         fill: true,
//       },
//     ],
//   };
// Chart data for appointments trend (Stacked Bar chart)
  const appointmentChartData = {
    labels: appointmentData.map((item) => item.month).reverse(),
    datasets: [
      {
        label: "Completed",
        data: appointmentData.map((item) => item.completed).reverse(),
        backgroundColor: "#28a745",
      },
      {
        label: "Cancelled",
        data: appointmentData.map((item) => item.cancelled).reverse(),
        backgroundColor: "#dc3545",
      },
      {
        label: "Pending",
        data: appointmentData.map((item) => (item.total - item.completed - item.cancelled)).reverse(),
        backgroundColor: "#ffc107",
      },
    ],
  };

  

  // Chart data for revenue trend (Line chart)
  const revenueChartData = {
    labels: revenueData.map((item) => item.month).reverse(),
    datasets: [
      {
        label: "Total Revenue ($)",
        data: revenueData.map((item) => item.revenue).reverse(),
        borderColor: "#ffc107",
        backgroundColor: "rgba(255, 193, 7, 0.1)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  // Chart data for doctor performance (Bar chart)
  const doctorChartData = {
    labels: doctorPerf.map((doc) => `${doc.first_name} ${doc.last_name}`),
    datasets: [
      {
        label: "Total Appointments",
        data: doctorPerf.map((doc) => doc.total_appointments),
        backgroundColor: "#667eea",
      },
      {
        label: "Completed",
        data: doctorPerf.map((doc) => doc.completed_appointments),
        backgroundColor: "#28a745",
      },
    ],
  };

  // Chart data for patient demographics (Doughnut chart)
  const patientDemoChartData = {
    labels: ["Under 18", "18-65", "Over 65"],
    datasets: [
      {
        label: "Age Distribution",
        data: [patientStats.under_18, patientStats.age_18_65, patientStats.over_65],
        backgroundColor: ["#667eea", "#764ba2", "#f093fb"],
        borderColor: ["#667eea", "#764ba2", "#f093fb"],
      },
    ],
  };

  // Chart data for gender distribution (Pie chart)
  const genderChartData = {
    labels: ["Male", "Female"],
    datasets: [
      {
        label: "Gender Distribution",
        data: [patientStats.male_count, patientStats.female_count],
        backgroundColor: ["#667eea", "#f093fb"],
        borderColor: ["#667eea", "#f093fb"],
      },
    ],
  };

//   const chartOptions = {
//     responsive: true,
//     maintainAspectRatio: true,
//     plugins: {
//       legend: {
//         position: "top",
//       },
//     },
//   };
const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: "top",
      },
    },
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
      },
    },
  };

// Export to PDF
  const exportToPDF = async () => {
    try {
      const element = analyticsRef.current;
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 190;
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add title
      pdf.setFontSize(16);
      pdf.text("RehabCare Analytics Report", 10, 10);
      pdf.setFontSize(10);
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, 10, 20);

      position = 30;
      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`RehabCare_Analytics_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("PDF export failed:", error);
      alert("Failed to export PDF");
    }
  };

  // Export Appointments to CSV
  const exportAppointmentsCSV = () => {
    const csv_data = appointmentData.map((item) => ({
      Month: item.month,
      Total: item.total,
      Completed: item.completed,
      Cancelled: item.cancelled,
    }));

    const csv = Papa.unparse(csv_data);
    downloadCSV(csv, "appointments_data.csv");
  };

  // Export Revenue to CSV
  const exportRevenueCSV = () => {
    const csv_data = revenueData.map((item) => ({
      Month: item.month,
      "Total Revenue": item.revenue,
      Paid: item.paidCount,
      Pending: item.pendingCount,
    }));

    const csv = Papa.unparse(csv_data);
    downloadCSV(csv, "revenue_data.csv");
  };

  // Export Doctor Performance to CSV
  const exportDoctorPerformanceCSV = () => {
    const csv_data = doctorPerf.map((doc) => ({
      "Doctor Name": `${doc.first_name} ${doc.last_name}`,
      Specialization: doc.specialization,
      "Total Appointments": doc.total_appointments,
      Completed: doc.completed_appointments,
      Cancelled: doc.cancelled_appointments,
    }));

    const csv = Papa.unparse(csv_data);
    downloadCSV(csv, "doctor_performance.csv");
  };

  // Export Patient Statistics to CSV
  const exportPatientStatsCSV = () => {
    const csv_data = [
      {
        "Metric": "Total Patients",
        "Count": patientStats.total_patients
      },
      {
        "Metric": "Under 18",
        "Count": patientStats.under_18
      },
      {
        "Metric": "18-65",
        "Count": patientStats.age_18_65
      },
      {
        "Metric": "Over 65",
        "Count": patientStats.over_65
      },
      {
        "Metric": "Male",
        "Count": patientStats.male_count
      },
      {
        "Metric": "Female",
        "Count": patientStats.female_count
      },
    ];

    const csv = Papa.unparse(csv_data);
    downloadCSV(csv, "patient_statistics.csv");
  };

  // Helper function to download CSV
  const downloadCSV = (csv, filename) => {
    const link = document.createElement("a");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="analytics-loading">Loading analytics...</div>;

  return (
    <div className="analytics-container">
        <div className="analytics-header">
      <h3>📊 Reporting and Analytics</h3>

{/* Export Buttons */}
        <div className="export-buttons">
          <button className="export-btn pdf-btn" onClick={exportToPDF} title="Export entire report as PDF">
            📄 Export as PDF
          </button>
          <button className="export-btn csv-btn" onClick={exportAppointmentsCSV} title="Export appointments data">
            📊 Appointments CSV
          </button>
          <button className="export-btn csv-btn" onClick={exportRevenueCSV} title="Export revenue data">
            💰 Revenue CSV
          </button>
          <button className="export-btn csv-btn" onClick={exportDoctorPerformanceCSV} title="Export doctor performance">
            👨‍⚕️ Doctors CSV
          </button>
          <button className="export-btn csv-btn" onClick={exportPatientStatsCSV} title="Export patient statistics">
            👥 Patients CSV
          </button>
        </div>
        </div>
<div ref={analyticsRef}>
      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <h4>Total Patients</h4>
          <p className="kpi-value">{overview.totalPatients}</p>
        </div>
        <div className="kpi-card">
          <h4>Total Doctors</h4>
          <p className="kpi-value">{overview.totalDoctors}</p>
        </div>
        <div className="kpi-card">
          <h4>Completed Appointments</h4>
          <p className="kpi-value">{overview.completedAppointments}</p>
        </div>
        <div className="kpi-card">
          <h4>Total Revenue</h4>
          <p className="kpi-value">${overview.totalRevenue?.toFixed(2)}</p>
        </div>
      </div>
{/* System Performance NOT YET WORKING */}
    {/* System Performance
      {systemPerf && (
        <div className="analytics-section">
          <h4>🖥 System Performance</h4>
          <div className="system-grid">
            <div className="demo-item"><span>Uptime:</span><strong>{systemPerf.uptime_readable}</strong></div>
            <div className="demo-item"><span>Avg Resp Time:</span><strong>{systemPerf.avg_response_time_seconds}s</strong></div>
            <div className="demo-item"><span>Total Requests:</span><strong>{systemPerf.total_requests}</strong></div>
            <div className="demo-item"><span>Active DB Conns:</span><strong>{systemPerf.active_db_connections ?? 'n/a'}</strong></div>
            <div className="demo-item"><span>CPU %:</span><strong>{systemPerf.cpu_percent ?? 'n/a'}</strong></div>
            <div className="demo-item"><span>Memory %:</span><strong>{systemPerf.memory_percent ?? 'n/a'}</strong></div>
          </div>
        </div>
      )} */}


 
      {/* Patient Demographics */}
      <div className="analytics-section">
        <h4>👥 Patient Demographics</h4>
        <div className="demographics-grid">
          <div className="demo-item">
            <span>Total Patients:</span>
            <strong>{patientStats.total_patients}</strong>
          </div>
          <div className="demo-item">
            <span>Under 18:</span>
            <strong>{patientStats.under_18}</strong>
          </div>
          <div className="demo-item">
            <span>18-65:</span>
            <strong>{patientStats.age_18_65}</strong>
          </div>
          <div className="demo-item">
            <span>Over 65:</span>
            <strong>{patientStats.over_65}</strong>
          </div>
          <div className="demo-item">
            <span>Male:</span>
            <strong>{patientStats.male_count}</strong>
          </div>
          <div className="demo-item">
            <span>Female:</span>
            <strong>{patientStats.female_count}</strong>
          </div>
        </div>
      </div>

{/* Patient Demographics Charts */}
      <div className="charts-grid">
        <div className="chart-container">
          <h4>👥 Age Distribution</h4>
          <Doughnut data={patientDemoChartData} options={chartOptions} />
        </div>

        <div className="chart-container">
          <h4>👥 Gender Distribution</h4>
          <Pie data={genderChartData} options={chartOptions} />
        </div>
      </div>

      {/* Appointments Trend */}
      <div className="analytics-section">
        <h4>📅 Appointments Trend (Last 12 Months)</h4>
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Total</th>
              <th>Completed</th>
              <th>Cancelled</th>
            </tr>
          </thead>
          <tbody>
            {appointmentData.map((item, idx) => (
              <tr key={idx}>
                <td>{item.month}</td>
                <td>{item.total}</td>
                <td className="completed">{item.completed}</td>
                <td className="cancelled">{item.cancelled}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

{/* Charts Section */}
      <div className="charts-grid">
        {/* Appointments Trend Chart */}
        <div className="chart-container">
          
          <Bar data={appointmentChartData} options={chartOptions} />
        </div>
</div>

      {/* Revenue Trend */}
      <div className="analytics-section">
        <h4>💰 Revenue Trend (Last 12 Months)</h4>
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Total Revenue</th>
              <th>Paid</th>
              <th>Pending</th>
            </tr>
          </thead>
          <tbody>
            {revenueData.map((item, idx) => (
              <tr key={idx}>
                <td>{item.month}</td>
                <td className="revenue">${item.revenue.toFixed(2)}</td>
                <td className="completed">{item.paidCount}</td>
                <td className="pending">{item.pendingCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

{/* Revenue Trend Chart */}
        <div className="chart-container">
          
          <Line data={revenueChartData} options={chartOptions} />
        </div>
      


      {/* Doctor Performance */}
      <div className="analytics-section">
        <h4>👨‍⚕️ Doctor Performance</h4>
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Doctor Name</th>
              <th>Specialization</th>
              <th>Total Appointments</th>
              <th>Completed</th>
              <th>Cancelled</th>
            </tr>
          </thead>
          <tbody>
            {doctorPerf.map((doctor, idx) => (
              <tr key={idx}>
                <td>{doctor.first_name} {doctor.last_name}</td>
                <td>{doctor.specialization}</td>
                <td>{doctor.total_appointments}</td>
                <td className="completed">{doctor.completed_appointments}</td>
                <td className="cancelled">{doctor.cancelled_appointments}</td>
              </tr>
            ))}
          </tbody>
        </table>

{/* Doctor Performance Chart */}
      <div className="chart-container full-width">
        
        <Bar data={doctorChartData} options={chartOptions} />
      </div>

      </div>
    </div>
    </div>
  );
}

export default AdminAnalytics;