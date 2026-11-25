// Seat labels look like A1, A2 ... B1 ... Rows are letters, seats are numbers.
exports.buildSeatLabels = (rows, seatsPerRow) => {
  const labels = [];
  for (let r = 0; r < rows; r += 1) {
    for (let s = 1; s <= seatsPerRow; s += 1) labels.push(`${String.fromCharCode(65 + r)}${s}`);
  }
  return labels;
};

exports.isValidSeat = (label, rows, seatsPerRow) => {
  const m = /^([A-Z])(\d{1,2})$/.exec(label);
  if (!m) return false;
  const row = m[1].charCodeAt(0) - 65;
  const num = Number(m[2]);
  return row >= 0 && row < rows && num >= 1 && num <= seatsPerRow;
};
