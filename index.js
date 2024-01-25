const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const multer = require("multer");
const exceljs = require("exceljs");
const xlsx = require("xlsx");
const { format } = require("date-fns");
var cors = require("cors");
const pool = require("./connection");
require("dotenv").config();

app.use(express.json());
app.use(bodyParser.json());
app.use(cors());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// app.post("/api/upload", upload.single("file"), async (req, res,next) => {
//     try {
//       const fileBuffer = req.file.buffer;
//       const workbook = new exceljs.Workbook();
//       const worksheet = await workbook.xlsx.load(fileBuffer).then(() => {
//         return workbook.getWorksheet(1);
//       });

//     const columnData = [];

//      worksheet.eachRow({ includeEmpty: false }, async (row, rowNumber) => {
//       if (rowNumber === 1) return;
//       console.log(rowNumber)

//       const data = row.values.slice(1);

//        console.log(data)
//       const insertDataQuery = `
//         INSERT INTO (employeeid, employeename, employeestatus, joiningdate, birthdate, skills, salarydetails, address, phonenumber)
//         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)  RETURNING *
//       `;

//       await pool.query(insertDataQuery, data);
//       // columnData.push(data)
//       res.status(200).json({ success: true, data: {data}});
//     });

//     } catch (error) {
//       console.error(error);
//       res.status(500).json({ success: false, message: "Internal Server Error" });
//     }
//   });

app.post("/api/upload", upload.single("file"), (req, res) => {
  const buffer = req.file.buffer;
  const workbook = xlsx.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { cellDates: true });

  const columns = Object.keys(rows[0]);
  

  console.log(rows[0].joiningdate)

  const tableName = `employee_${Date.now()}`;
  const createTableQuery = `CREATE TABLE IF NOT EXISTS ${tableName} (${columns
    .map((column) => `${column} ${getColumnDataType(column)}`)
    .join(", ")});`;

  columns.forEach((column) => {
    console.log(`Column: ${column}, Data Type: ${getColumnDataType(column)}`);
  });
  // Use the pool to acquire a client from the connection pool
  pool.connect((err, client, done) => {
    if (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
      return;
    }

    // Execute the query to create the table
    client.query(createTableQuery, (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
      } else {
        // Insert data into the created table
        const insertQuery = `INSERT INTO ${tableName} (${columns.join(
          ", "
        )}) VALUES ${rows
          .map(
            (row) =>
              `(${columns
                .map((column) =>
                  parseColumnValue(row[column], getColumnDataType(column))
                )
                .join(", ")})`
          )
          .join(", ")};`;

        // Execute the query to insert data
        client.query(insertQuery, (err, result) => {
          done();

          if (err) {
            console.error(err);
            res.status(500).send("Internal Server Error");
          } else {
            res
              .status(200)
              .json({ success: true, message: "Category Added Successfully" });
          }
        });
      }
    });
  });
});

// Helper function to determine column data type
function getColumnDataType(column) {
  if (column.toLowerCase().includes("integer")) {
    return "DATE";
  } else if (column.toLowerCase().includes("id")) {
    return "SERIAL";
  } else {
    return "VARCHAR(200)";
  }
}


function parseColumnValue(value, dataType) {
  if (dataType === "SERIAL" || typeof value === "number") {
    return value;
  } else if (dataType === "DATE") {
    const formattedDate = format(new Date(value), "yyyy-MM-dd HH:mm:ss");
    return `'${formattedDate}'`;
  } else {
    return `'${value}'`;
  }
}



app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
