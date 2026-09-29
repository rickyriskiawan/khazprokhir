/**
 * Memformat array nomor pack menjadi string kanonikal yang rapi
 * Contoh: [1, 2, 3, 4, 5, 13, 16, 20, 21, 22] -> "1-5, 13, 16, 20-22"
 * 
 * @param {number[]} numbers 
 * @returns {string}
 */
export function formatPackNumbers(numbers) {
  if (!Array.isArray(numbers) || numbers.length === 0) {
    return '';
  }

  const sorted = [...numbers].sort((a, b) => a - b);
  const segments = [];
  let rangeStart = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    if (current === prev + 1) {
      prev = current;
    } else {
      if (rangeStart === prev) {
        segments.push(`${rangeStart}`);
      } else {
        segments.push(`${rangeStart}-${prev}`);
      }
      rangeStart = current;
      prev = current;
    }
  }

  if (rangeStart === prev) {
    segments.push(`${rangeStart}`);
  } else {
    segments.push(`${rangeStart}-${prev}`);
  }

  return segments.join(', ');
}

/**
 * Mem-parsing string daftar pack (kontigu maupun non-kontigu/acak)
 * Contoh input: "1-10, 13, 16, 20, 22"
 * 
 * @param {string} input 
 * @returns {{
 *   isValid: boolean,
 *   numbers: number[],
 *   totalPack: number,
 *   packDari: number,
 *   packSampai: number,
 *   jumlahBilyet: number,
 *   canonicalList: string,
 *   error?: string
 * }}
 */
export function parsePackRange(input) {
  if (!input || typeof input !== 'string' || input.trim() === '') {
    return {
      isValid: false,
      numbers: [],
      totalPack: 0,
      packDari: 0,
      packSampai: 0,
      jumlahBilyet: 0,
      canonicalList: '',
      error: 'Format nomor pack tidak boleh kosong.',
    };
  }

  const chunks = input.split(',').map((c) => c.trim()).filter(Boolean);
  if (chunks.length === 0) {
    return {
      isValid: false,
      numbers: [],
      totalPack: 0,
      packDari: 0,
      packSampai: 0,
      jumlahBilyet: 0,
      canonicalList: '',
      error: 'Format nomor pack tidak boleh kosong.',
    };
  }

  const seen = new Set();
  const numbers = [];

  for (const chunk of chunks) {
    // Single number pattern: e.g. "5"
    if (/^\d+$/.test(chunk)) {
      const num = parseInt(chunk, 10);
      if (num < 1 || num > 100) {
        return {
          isValid: false,
          numbers: [],
          totalPack: 0,
          packDari: 0,
          packSampai: 0,
          jumlahBilyet: 0,
          canonicalList: '',
          error: `Nomor pack #${num} harus berada dalam batas 1 sampai 100.`,
        };
      }
      if (seen.has(num)) {
        return {
          isValid: false,
          numbers: [],
          totalPack: 0,
          packDari: 0,
          packSampai: 0,
          jumlahBilyet: 0,
          canonicalList: '',
          error: `Nomor pack #${num} duplikat pada input.`,
        };
      }
      seen.add(num);
      numbers.push(num);
      continue;
    }

    // Range pattern: e.g. "1-10" or "1 - 10"
    if (/^\d+\s*-\s*\d+$/.test(chunk)) {
      const parts = chunk.split('-').map((p) => p.trim());
      const min = parseInt(parts[0], 10);
      const max = parseInt(parts[1], 10);

      if (min < 1 || min > 100 || max < 1 || max > 100) {
        return {
          isValid: false,
          numbers: [],
          totalPack: 0,
          packDari: 0,
          packSampai: 0,
          jumlahBilyet: 0,
          canonicalList: '',
          error: `Nomor pack pada rentang "${chunk}" harus berada dalam batas 1 sampai 100.`,
        };
      }

      if (min > max) {
        return {
          isValid: false,
          numbers: [],
          totalPack: 0,
          packDari: 0,
          packSampai: 0,
          jumlahBilyet: 0,
          canonicalList: '',
          error: `Rentang nomor pack tidak valid: ${min} lebih besar dari ${max}.`,
        };
      }

      for (let n = min; n <= max; n++) {
        if (seen.has(n)) {
          return {
            isValid: false,
            numbers: [],
            totalPack: 0,
            packDari: 0,
            packSampai: 0,
            jumlahBilyet: 0,
            canonicalList: '',
            error: `Nomor pack #${n} duplikat pada input.`,
          };
        }
        seen.add(n);
        numbers.push(n);
      }
      continue;
    }

    // Format tidak cocok dengan pola nomor maupun rentang
    return {
      isValid: false,
      numbers: [],
      totalPack: 0,
      packDari: 0,
      packSampai: 0,
      jumlahBilyet: 0,
      canonicalList: '',
      error: `Format segmen nomor pack tidak valid: "${chunk}". Gunakan format seperti "1-10, 13, 16".`,
    };
  }

  numbers.sort((a, b) => a - b);
  const totalPack = numbers.length;
  const packDari = numbers[0];
  const packSampai = numbers[numbers.length - 1];
  const bilyetPerPack = 45000;
  const jumlahBilyet = totalPack * bilyetPerPack;
  const canonicalList = formatPackNumbers(numbers);

  return {
    isValid: true,
    numbers,
    totalPack,
    packDari,
    packSampai,
    jumlahBilyet,
    canonicalList,
  };
}

/**
 * Mem-parsing query pencarian komposit: misalnya "AA-BA0" atau "AA-BA 0"
 * Memisahkan digit terakhir sebagai 'kepala' dan bagian sebelumnya sebagai 'seri'
 * 
 * @param {string} query 
 * @returns {{ seri: string, kepala: string, raw: string }}
 */
export function parseBatchSearchQuery(query) {
  if (!query || typeof query !== 'string') {
    return { seri: '', kepala: '', raw: '' };
  }
  const trimmed = query.trim();
  // Cocokkan teks diikuti angka tunggal di akhir, misal "AA-BA0", "AA-BA 0", "AABA0"
  const match = trimmed.match(/^([A-Za-z-]+)\s*(\d)$/);
  if (match) {
    return {
      seri: match[1].toUpperCase(),
      kepala: match[2],
      raw: trimmed,
    };
  }
  return {
    seri: trimmed.toUpperCase(),
    kepala: '0',
    raw: trimmed,
  };
}

