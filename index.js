const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const multer = require("multer");
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

app.post("/api/upload", upload.single("file"), (req, res) => {
  const buffer = req.file.buffer;
  const workbook = xlsx.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { cellDates: true });

  const columns = Object.keys(rows[0]);

  const tableName = `employee`;
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
              .json({ success: true, message: "File Uploaded Successfully" });
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

app.post("/api/addEmployee", async (req, res, next) => {
  try {
    const {
      employeeid,
      employeename,
      employeestatus,
      joiningdate,
      birthdate,
      skills,
      salarydetails,
      address,
      phonenumber,
      designation,
    } = req.body;

    const existingEmployeeById = await pool.query(
      "SELECT * FROM employee WHERE employeeid = $1",
      [employeeid]
    );

    if (existingEmployeeById.rows.length > 0) {
      return res
        .status(401)
        .json({ message: "Employee with this ID already exists!" });
    }

    // Check if employee with employeename already exists
    const existingEmployeeByName = await pool.query(
      "SELECT * FROM employee WHERE employeename = $1",
      [employeename]
    );

    if (existingEmployeeByName.rows.length > 0) {
      return res
        .status(401)
        .json({ message: "Employee with this Name already exists!" });
    }

    const result = await pool.query(
      "INSERT INTO employee (employeeid,employeename,employeestatus,joiningdate,birthdate,skills,salarydetails,address,phonenumber,designation) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING * ",
      [
        employeeid,
        employeename,
        employeestatus,
        joiningdate,
        birthdate,
        skills,
        salarydetails,
        address,
        phonenumber,
        designation,
      ]
    );

    return res.status(200).json({ message: "Employee Added Successfully" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.patch("/api/updateEmployee/:id", (req, res, next) => {
  let { employeename, designation, address, salarydetails } = req.body;
  const employeeid = req.params.id;
  pool.query(
    "UPDATE employee SET employeename = ($2), designation = ($3), address = ($4), salarydetails = ($5) WHERE employeeid = $1",
    [employeeid, employeename, designation, address, salarydetails],
    (err, result) => {
      if (!err) {
        if (result.rowCount == 0) {
          return res
            .status(404)
            .json({ message: "Employee id does not found" });
        }
        return res
          .status(200)
          .json({ message: "Employee Updated Successfully" });
      } else {
        return res.status(500).json(err);
      }
    }
  );
});

app.delete("/api/deleteEmployee/:id", (req, res, next) => {
  const employeeid = req.params.id;
  pool.query(
    "DELETE FROM employee WHERE employeeid = $1",
    [employeeid],
    (err, result) => {
      if (!err) {
        if (result.rowCount == 0) {
          return res
            .status(404)
            .json({ message: "Employee id does not found" });
        }
        return res
          .status(200)
          .json({ message: "Employee Deleted Successfully" });
      } else {
        return res.status(500).json(err);
      }
    }
  );
});

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
