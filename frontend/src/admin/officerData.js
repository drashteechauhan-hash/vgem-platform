export const officerStats = {
  activeTenders: 12,
  aiVerified: 64,
  avgTime: "4.2 min",
};

export const seedBids = [
  {
    id: "GM/2026/1842", bidder: "ABC Technologies", tender: "IT Infrastructure Supply",
    gstin: "27ABCDE1234F1Z5", pan: "ABCDE1234F", udyam: "UDYAM-MH-18-0044219", reg: "U72900MH2015PTC261847",
    submitted: "28 Aug 2026", status: "Awaiting Review", risk: 82, level: "high", confidence: 71,
    documents: [
      { name: "GST Certificate", status: "verified", conf: 98 },
      { name: "PAN", status: "verified", conf: 99 },
      { name: "ESIC", status: "missing", conf: 0 },
      { name: "ITR (AY 2025-26)", status: "review", conf: 74 },
      { name: "BIS Certificate", status: "mismatch", conf: 61 },
    ],
    flags: [
      { sev: "high", issue: "GSTIN mismatch", found: "Uploaded: 27ABCDE1234F1Z5 · Record: 27ABCDE1234F1Z6", conf: 96, rec: "Request clarification from bidder.", pts: 25 },
      { sev: "high", issue: "Missing ESIC proof", found: "No ESIC compliance document uploaded.", conf: 99, rec: "Request ESIC compliance proof.", pts: 20 },
      { sev: "medium", issue: "ITR under review", found: "Income Tax Return pending confirmation.", conf: 74, rec: "Await ITR verification.", pts: 15 },
    ],
  },
  {
    id: "GM/2026/1931", bidder: "XYZ Enterprises", tender: "Office Furniture Procurement",
    gstin: "07XYZAB5678C1Z2", pan: "XYZAB5678C", udyam: "UDYAM-DL-03-0091234", reg: "U51909DL2018PTC334521",
    submitted: "27 Aug 2026", status: "Awaiting Review", risk: 54, level: "medium", confidence: 85,
    documents: [
      { name: "GST Certificate", status: "verified", conf: 97 },
      { name: "PAN", status: "verified", conf: 99 },
      { name: "ESIC", status: "verified", conf: 95 },
      { name: "ITR (AY 2025-26)", status: "review", conf: 78 },
      { name: "Udyam", status: "verified", conf: 96 },
    ],
    flags: [
      { sev: "medium", issue: "ITR under review", found: "Income Tax Return pending confirmation for AY 2025-26.", conf: 78, rec: "Await ITR verification.", pts: 15 },
    ],
  },
  {
    id: "GM/2026/2017", bidder: "Nova Systems", tender: "Solar Panel Installation",
    gstin: "29NOVAB9012D1Z8", pan: "NOVAB9012D", udyam: "UDYAM-KA-09-0055678", reg: "U40108KA2017PTC102938",
    submitted: "27 Aug 2026", status: "Awaiting Review", risk: 18, level: "low", confidence: 96,
    documents: [
      { name: "GST Certificate", status: "verified", conf: 99 },
      { name: "PAN", status: "verified", conf: 99 },
      { name: "ESIC", status: "verified", conf: 97 },
      { name: "ITR (AY 2025-26)", status: "verified", conf: 98 },
      { name: "BIS Certificate", status: "verified", conf: 95 },
    ],
    flags: [],
  },
  {
    id: "GM/2026/2044", bidder: "Sharma Traders Pvt Ltd", tender: "Housekeeping Services",
    gstin: "07AABCS1234K1Z5", pan: "AABCS1234K", udyam: "UDYAM-DL-03-0021847", reg: "U51909DL2016PTC302145",
    submitted: "26 Aug 2026", status: "Awaiting Review", risk: 41, level: "medium", confidence: 88,
    documents: [
      { name: "GST Certificate", status: "verified", conf: 98 },
      { name: "PAN", status: "verified", conf: 99 },
      { name: "ESIC", status: "review", conf: 70 },
      { name: "Udyam", status: "verified", conf: 96 },
    ],
    flags: [
      { sev: "medium", issue: "ESIC under review", found: "ESIC document awaiting validation.", conf: 70, rec: "Await ESIC verification.", pts: 12 },
    ],
  },
];

export const seedActivity = [
  { text: "GST verification completed for 4 new bids", time: "2 hours ago" },
  { text: "Bid #GM/2026/1720 flagged by AI engine", time: "3 hours ago" },
];