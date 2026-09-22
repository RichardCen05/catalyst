/**
 * The three learning layers, as data.
 *
 * The explainer component renders these and the assistant answers questions
 * about them, so they live here rather than inside the component: two copies
 * of this list would start out identical and stop being so the first time
 * either was edited.
 */
import { primarySymbol } from "@/lib/data/fixtures";
import { OBSERVATION_WINDOWS, sessionWindowSentence } from "@/lib/agent/thresholds";

export type Teacher = "Anda" | "Pasar";

export interface Layer {
  index: number;
  name: string;
  teacher: Teacher;
  /** Ditampilkan sebagai badge bila ada; tanpa ini lapisnya dianggap berjalan penuh. */
  caveat?: { badge: string; detail: string };
  question: string;
  analogy: string;
  example: string;
  changes: string;
  keeps: string;
}

export const LAYERS: Layer[] = [
  {
    index: 1,
    name: "Preferensi",
    teacher: "Anda",
    question: "Apa yang Anda pedulikan?",
    analogy: "Seperti barista langganan yang hafal pesanan Anda. Dia tidak jadi ahli kopi — dia hafal selera. Dan selera tidak bisa salah.",
    example: "Anda menandai kartu volume perbankan “kurang relevan” beberapa kali. Kasus serupa turun dari urutan atas.",
    changes: "Urutan daftar kasus di layar Kasus, dan panjang penjelasan.",
    keeps: "Angka, sumber, dan kesimpulan analisis. Juga jawaban asisten: daftar yang disebutkannya mengikuti urutan pantauan Anda, tidak diurutkan ulang oleh feedback.",
  },
  {
    index: 2,
    name: "Aturan",
    teacher: "Anda",
    question: "Apa yang Anda anggap penting?",
    analogy: "Seperti memberi tahu asisten baru: “kalau nilainya di bawah sekian, tidak usah naik ke meja saya.” Itu cara kerja yang Anda tetapkan, bukan fakta tentang dunia.",
    example: "Anda menutup kasus dengan catatan “kenaikan harga nikel di bawah dua minggu belum berarti apa-apa”. Catalyst mengusulkan aturannya; Anda yang menerima.",
    changes: "Aturan yang dipakai analisis berikutnya.",
    keeps: "Fakta pasar. Koreksi Anda tetap hipotesis sampai sumber memverifikasinya.",
  },
  {
    index: 3,
    name: "Kalibrasi",
    teacher: "Pasar",
    caveat: {
      badge: "mengukur, belum mengoreksi",
      detail: "Catalyst sudah mencatat klaimnya dan menagihnya ke rekaman harga — hasilnya ada di bagian “Prediksi yang ditagih ke pasar” di bawah. Yang belum: mengubah ambang atau jendelanya sendiri. Koreksi muncul sebagai usulan, dan Anda yang memutuskan.",
    },
    question: "Seberapa sering tebakan Catalyst tepat?",
    analogy: "Seperti ramalan cuaca. BMKG bilang besok 70% hujan; besok langit yang menjawab. Tidak perlu ada yang komplain supaya ketahuan ramalannya terlalu percaya diri.",
    example: `Catalyst mencatat “volume ${primarySymbol} akan melampaui ambang dalam ${sessionWindowSentence(OBSERVATION_WINDOWS.defaultSessions)}”, lalu memeriksanya sendiri setelah jendela itu lewat. Data volume yang memutuskan, bukan pengguna.`,
    changes: "Ambang dan perkiraan jeda waktu yang dipakai Catalyst — setelah Anda menyetujui usulannya.",
    keeps: "Apa yang penting bagi Anda — itu tetap datang dari Anda.",
  },
];
