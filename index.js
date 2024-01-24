const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const multer = require("multer");
const exceljs = require("exceljs");
var cors = require("cors");
const pool = require("./connection");
require("dotenv").config();

app.use(express.json());
app.use(bodyParser.json());
app.use(cors());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// app.post("/api/upload", upload.single("file"), async (req, res) => {
//     try {
//       const fileBuffer = req.file.buffer;
//       const workbook = new exceljs.Workbook();
//       const worksheet = await workbook.xlsx.load(fileBuffer).then(() => {
//         console.log(workbook.rows)
//         return workbook.getWorksheet(1);
//       });
  
//       const headers = worksheet.getRow(1).values;
    
//       // Create a table dynamically based on the Excel headers
//       const tableName = `employee_${Date.now()}`;
//       const createTableQuery = `
//         CREATE TABLE IF NOT EXISTS ${tableName} (
//           ${headers.map((header, index) => `"${header}" VARCHAR(255)${index === headers.length - 1 ? '' : ','}`).join('')}
//         )`;
  
//       await pool.query(createTableQuery);
  
//       // Extract data from the worksheet
//       const data = [];
//       worksheet.eachRow({ includeEmpty: false, firstRow: 2 }, (row, rowNumber) => {
//         const rowData = {};
//         headers.forEach((header, index) => {
//           rowData[header] = row.getCell(index).value;
//         });
//         data.push(rowData);
//       });
  
//       // Insert data into the dynamically created table
//       const insertDataQuery = `
//         INSERT INTO ${tableName} (${headers.map((header, index) => `${header}${index === headers.length - 1 ? '' : ','}`).join('')})
//         VALUES (${headers.map((_, index) => `$${index}${index === headers.length - 1 ? '' : ','}`).join('')})`;
  
//         console.log('Insert Data Query:', insertDataQuery);

//       data.forEach(async (rowData) => {
//         const values = headers.map((header) => rowData[header]);
//         console.log('Inserting Data:', values);
//         await pool.query(insertDataQuery, values);
//       });
  
//       console.log('Data inserted successfully');
  
//       res.status(200).json({
//         success: true,
//         message: "Data uploaded successfully",
//         tableName,
//       });
//     } catch (error) {
//       console.error(error);
//       res.status(500).json({ success: false, message: "Internal Server Error" });
//     }
//   });
  

app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      const fileBuffer = req.file.buffer;
      const workbook = new exceljs.Workbook();
      const worksheet = await workbook.xlsx.load(fileBuffer).then(() => {
        return workbook.getWorksheet(1);
      });
      
      worksheet.eachRow(function(row) {
        
        const data = row.values
        console.log(data);

          return res.status(200).json({success: true})
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  });

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
