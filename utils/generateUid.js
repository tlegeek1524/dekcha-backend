function generateUid() {
    const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // A-Z
    const number = Math.floor(100 + Math.random() * 900); // 100-999
    return `${letter}${number}`;
  }
  
  module.exports = generateUid;
  