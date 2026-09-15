/**
 * Format number into Indonesian Rupiah currency format.
 * Example: 4500000000 -> "Rp 4.500.000.000"
 */
export const formatRupiah = (amount) => {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return 'Rp 0';
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount));
};

/**
 * Format sheets / bilyet volume with thousands separator.
 * Example: 45000 -> "45.000 Lembar"
 */
export const formatBilyet = (sheets) => {
  if (sheets === null || sheets === undefined || isNaN(Number(sheets))) {
    return '0 Lembar';
  }
  return `${new Intl.NumberFormat('id-ID').format(Number(sheets))} Lembar`;
};

/**
 * Format integer into 4-digit zero-padded doos number.
 * Example: 1 -> "0001", 18 -> "0018"
 */
export const formatDoos = (num) => {
  if (num === null || num === undefined || isNaN(Number(num))) {
    return '0000';
  }
  return String(num).padStart(4, '0');
};

/**
 * Format date string into official Indonesian date.
 * Example: "2026-09-15" -> "15 September 2026"
 */
export const formatIndonesianDate = (dateVal, includeTime = false) => {
  if (!dateVal) return '-';
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return String(dateVal);

  const options = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  };

  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
    return `${date.toLocaleDateString('id-ID', options)} WIB`;
  }

  return date.toLocaleDateString('id-ID', options);
};

/**
 * Format range of pack numbers.
 * Example: (1, 4) -> "Pack 01 - 04"
 */
export const formatPackRange = (dari, sampai) => {
  if (!dari && !sampai) return '-';
  const pDari = String(dari).padStart(2, '0');
  const pSampai = String(sampai).padStart(2, '0');
  return dari === sampai ? `Pack ${pDari}` : `Pack ${pDari} - ${pSampai}`;
};

/**
 * Format range of doos numbers with 4-digit padding.
 * Example: (1, 9) -> "Doos 0001 - 0009"
 */
export const formatDoosRange = (awal, akhir) => {
  if (!awal && !akhir) return '-';
  const dAwal = formatDoos(awal);
  const dAkhir = formatDoos(akhir);
  return awal === akhir ? `Doos ${dAwal}` : `Doos ${dAwal} - ${dAkhir}`;
};
