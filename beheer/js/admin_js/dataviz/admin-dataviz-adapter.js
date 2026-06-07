import { db, collection, getDocs } from '../../site_js/core/firebase.js';

export const CONFIG = {
  NET_FACTOR: 0.76,
  DAYS_IN_YEAR: 365,
  SEASON_MAP: {
    winter: [11, 0, 1, 2],
    spring: [3, 4],
    summer: [5, 6, 7],
    autumn: [8, 9, 10],
  },
};

/**
 * Haalt alle boekingen op uit Firebase en normaliseert ze 
 * naar de state.rawRows structuur die verwacht wordt door DataVis.
 */
export async function fetchDatavizRows() {
  try {
    const querySnapshot = await getDocs(collection(db, "bookings"));
    const rows = [];

    querySnapshot.forEach(doc => {
      const data = doc.data();
      const id = doc.id;
      
      const checkInDate = new Date(data.checkIn);
      const checkOutDate = new Date(data.checkOut);
      
      // Boekingsdatum (bij onbekend, pak createdAt of checkInDate)
      let bookedAtDate = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate() : null;
      if (!bookedAtDate) {
         // Fallback als createdAt een string is
         if (data.createdAt && typeof data.createdAt === 'string') {
             bookedAtDate = new Date(data.createdAt);
         } else if (data.importedAt) {
             bookedAtDate = new Date(data.importedAt);
         } else {
             // Hele ruwe schatting, 2 maanden voor checkin (of we laten het leeg)
             bookedAtDate = new Date(checkInDate);
             bookedAtDate.setMonth(bookedAtDate.getMonth() - 2);
         }
      }

      const isOwner = data.type === 'owner' || id.startsWith('Owner-');
      const gross = isOwner ? 0 : (data.rent || data.totalAmount || 0);

      const adults = parseInt(data.adults) || 0;
      const kids = parseInt(data.children) || 0;
      const babies = parseInt(data.babies) || 0;
      const totalGuests = adults + kids + babies;
      
      // Bereken nachten als data.nights ontbreekt
      let nights = data.nights;
      if (!nights || isNaN(nights)) {
          const diffTime = Math.abs(checkOutDate - checkInDate);
          nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      rows.push({
        ...data,
        __aankomst: checkInDate,
        __vertrek: checkOutDate,
        __nights: nights,
        __owner: isOwner,
        __gross: gross,
        __net: gross * CONFIG.NET_FACTOR,

        __bookingRaw: id,
        __bookedAt: bookedAtDate,
        __accomCode: "GIPFEL",
        __accomName: "Gipfel Lodge",
        __guest: data.guestName || "Onbekende gast",
        __email: data.guestEmail || "",
        __phone: data.guestPhone || "",
        __countryCode: (data.guestCountry || data.country || "").toUpperCase(),
        __adults: adults,
        __kids: kids,
        __babies: babies,
        __totalGuests: totalGuests,
        __pets: data.pets || 0,
        __note: data.message || "",
      });
    });

    console.log(`📊 Dataviz Adapter: ${rows.length} boekingen ingeladen vanuit Firebase.`);
    return rows;
  } catch (error) {
    console.error("Fout bij ophalen Firebase boekingen voor dataviz:", error);
    return [];
  }
}
