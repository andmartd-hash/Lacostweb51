import React, { useState, useEffect, useMemo } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  deleteDoc, // Importamos deleteDoc
  onSnapshot,
  collection,
  getDocs,
} from "firebase/firestore";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import {
  Trash2,
  Database,
  Settings,
  TrendingUp,
  Upload,
  Download,
  X,
  Cloud,
  Wifi,
  AlertCircle,
  Key,
  Link as LinkIcon,
  Globe,
  RefreshCcw,
  LogOut,
  User,
  Lock,
  Clock,
  CheckCircle2,
  Search,
  FileText,
  Plus,
  Minus,
  Save,
  Info,
  List, 
  Truck, 
} from "lucide-react";

// --- ⚠️ ZONA DE CONFIGURACIÓN COMPARTIDA ⚠️ ---
const SHARED_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBDNPdGdbn_coDkTVPm0K0t7dscN__qhTQ",
  authDomain: "lacostweb-amd01.firebaseapp.com",
  projectId: "lacostweb-amd01",
  storageBucket: "lacostweb-amd01.firebasestorage.app",
  messagingSenderId: "711419531773",
  appId: "1:711419531773:web:203c858a25ed0a6bd2c994",
  measurementId: "G-BR6KS7N821",
};

// --- FIREBASE INIT HELPERS ---
const appId = "lacostweb-shared-v1";

let globalAuth = null;
let globalDb = null;

const getFirebaseConfig = () => {
  if (SHARED_FIREBASE_CONFIG) return SHARED_FIREBASE_CONFIG;
  if (typeof __firebase_config !== "undefined")
    return JSON.parse(__firebase_config);
  const local = localStorage.getItem("lacostweb_firebase_config");
  return local ? JSON.parse(local) : null;
};

const activeConfig = getFirebaseConfig();

if (activeConfig && !getApps().length) {
  try {
    const app = initializeApp(activeConfig);
    globalAuth = getAuth(app);
    globalDb = getFirestore(app);
  } catch (error) {
    console.warn("Auto-init warning:", error);
  }
}

// --- COMPONENTS ---
const IbmLogo = () => (
  <svg
    viewBox="0 0 100 100"
    className="h-12 w-12 shadow-sm rounded-xl"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="100" height="100" rx="16" fill="black" />
    <defs>
      <mask id="ibm-stripes">
        <rect width="100" height="100" fill="white" />
        <rect y="36" width="100" height="3" fill="black" />
        <rect y="43" width="100" height="3" fill="black" />
        <rect y="50" width="100" height="3" fill="black" />
        <rect y="57" width="100" height="3" fill="black" />
        <rect y="64" width="100" height="3" fill="black" />
      </mask>
    </defs>
    <text
      x="50"
      y="68"
      fontSize="40"
      fontWeight="900"
      fontFamily="serif"
      textAnchor="middle"
      fill="#3b82f6"
      mask="url(#ibm-stripes)"
      style={{
        letterSpacing: "2px",
        filter: "drop-shadow(0px 0px 2px rgba(59,130,246,0.8))",
      }}
    >
      IBM
    </text>
  </svg>
);

// --- UTILITIES ---
const parseRawFloat = (val) => {
  if (!val) return 0;
  if (typeof val === "number") return val;
  const clean = val.toString().replace(/[^0-9.-]/g, "");
  return parseFloat(clean) || 0;
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const getInitialDates = () => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  const formatDate = (d) => d.toISOString().split("T")[0];
  return { start: formatDate(start), end: formatDate(end) };
};

const getQuoteIdFromUrl = () => {
  if (typeof window !== "undefined") {
    try {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id");
      if (id) return id;
    } catch (e) {
      console.warn("Could not read URL params:", e);
    }
  }
  return "COT-NUEVA";
};

// --- INITIAL MASTER DATA ---
const INITIAL_COUNTRIES = [
  { Country: "Argentina", Currency: "ARS", ER: 1428.95, Tax: 1 },
  { Country: "Brazil", Currency: "BRL", ER: 5.34, Tax: 1 },
  { Country: "Chile", Currency: "CLP", ER: 934.7, Tax: 1 },
  { Country: "Colombia", Currency: "COP", ER: 3775.22, Tax: 1 },
  { Country: "Ecuador", Currency: "USD", ER: 1, Tax: 1 },
  { Country: "Peru", Currency: "PEN", ER: 3.37, Tax: 1 },
  { Country: "Mexico", Currency: "MXN", ER: 18.42, Tax: 1 },
  { Country: "Uruguay", Currency: "UYU", ER: 39.73, Tax: 1 },
  { Country: "Venezuela", Currency: "VES", ER: 235.28, Tax: 1 },
  { Country: "USA", Currency: "USD", ER: 1, Tax: 1 },
  { Country: "Canada", Currency: "USD", ER: 1, Tax: 1 },
];

const INITIAL_RISK = [
  { Risk: "Low", Contingency: 0.02 },
  { Risk: "Medium", Contingency: 0.05 },
  { Risk: "High", Contingency: 0.09 },
];

const INITIAL_OFFERING = [
  {
    Offering: "IBM Hardware Resell for Server and Storage-Lenovo",
    L40: "6942-1BT Location Based Services",
  },
  { Offering: "1-HWMA MVS SPT other Prod", L40: "6942-0IC Conga by CSV" },
  { Offering: "2-HWMA MVS SPT other Prod", L40: "6942-0IC Conga by CSV" },
  { Offering: "SWMA MVS SPT other Prod", L40: "6942-76O Conga by CSV" },
  { Offering: "IBM Support for Red Hat", L40: "6948-B73 Conga by CSV" },
  {
    Offering: "IBM Support for Red Hat - Enterprise Linux Subscription",
    L40: "6942-42T Location Based Services",
  },
  {
    Offering: "Subscription for Red Hat",
    L40: "6948-66J Location Based Services",
  },
  { Offering: "Support for Red Hat", L40: "6949-66K Location Based Services" },
  {
    Offering: "IBM Support for Oracle",
    L40: "6942-42E Location Based Services",
  },
  {
    Offering: "IBM Customized Support for Multivendor Hardware Services",
    L40: "6942-76T Location Based Services",
  },
  {
    Offering: "IBM Customized Support for Multivendor Software Services",
    L40: "6942-76U Location Based Services",
  },
  {
    Offering: "IBM Customized Support for Hardware Services-Logo",
    L40: "6942-76V Location Based Services",
  },
  {
    Offering: "IBM Customized Support for Software Services-Logo",
    L40: "6942-76W Location Based Services",
  },
  {
    Offering: "HWMA MVS SPT other Loc",
    L40: "6942-0ID Location Based Services",
  },
  {
    Offering: "SWMA MVS SPT other Loc",
    L40: "6942-0IG Location Based Services",
  },
  {
    Offering: "Relocation Services - Packaging",
    L40: "6942-54E Location Based Services",
  },
  {
    Offering: "Relocation Services - Movers Charge",
    L40: "6942-54F Location Based Services",
  },
  {
    Offering: "Relocation Services - Travel and Living",
    L40: "6942-54R Location Based Services",
  },
  {
    Offering: "Relocation Services - External Vendor's Charge",
    L40: "6942-78O Location Based Services",
  },
  {
    Offering: "IBM Hardware Resell for Networking and Security Alliances",
    L40: "6942-1GE Location Based Services",
  },
  {
    Offering: "IBM Hardware Resell for Networking and Security Alliances",
    L40: "6942-1GF Location Based Services",
  },
  {
    Offering: "System Technical Support Service-MVS-STSS",
    L40: "6942-1FN Location Based Services",
  },
  {
    Offering: "System Technical Support Service-Logo-STSS",
    L40: "6942-1KJ Location Based Services",
  },
];

const INITIAL_SLC = [
  { Scope: "Global", SLC: "M1A", UPLF: 1 },
  { Scope: "Global", SLC: "M16", UPLF: 1 },
  { Scope: "Global", SLC: "M19", UPLF: 1 },
  { Scope: "Global", SLC: "M5B", UPLF: 1.05 },
  { Scope: "Global", SLC: "M47", UPLF: 1.5 },
  { Scope: "Global", SLC: "MJ7", UPLF: 1.1 },
  { Scope: "Global", SLC: "M3F", UPLF: 1.15 },
  { Scope: "Global", SLC: "M3B", UPLF: 1.2 },
  { Scope: "Global", SLC: "M33", UPLF: 1.3 },
  { Scope: "Global", SLC: "M2F", UPLF: 1.4 },
  { Scope: "Global", SLC: "M2B", UPLF: 1.6 },
  { Scope: "Global", SLC: "M23", UPLF: 1.7 },
  { Scope: "Global", SLC: "1159", UPLF: 1 },
  { Scope: "Global", SLC: "5318", UPLF: 0.8 },
  { Scope: "only Brazil", SLC: "NStd5x9", UPLF: 1 },
  { Scope: "only Brazil", SLC: "NStd5x10", UPLF: 1.023 },
  { Scope: "only Brazil", SLC: "NStd5x11", UPLF: 1.042 },
  { Scope: "only Brazil", SLC: "NStd5x12", UPLF: 1.07 },
  { Scope: "only Brazil", SLC: "NStd5x13", UPLF: 1.07 },
  { Scope: "only Brazil", SLC: "NStd5x15", UPLF: 1.091 },
  { Scope: "only Brazil", SLC: "NStd5x16", UPLF: 1.1 },
  { Scope: "only Brazil", SLC: "NStdFix12 5x15", UPLF: 1.141 },
  { Scope: "only Brazil", SLC: "NStdFix12 5x24", UPLF: 1.193 },
  { Scope: "only Brazil", SLC: "NStdFix12 7x24", UPLF: 1.25 },
];

const INITIAL_LPLAT_GLOBAL = [
  {
    Def: "Mainframe",
    Plat: "Mainframe",
    Argentina: 395855.46,
    Chile: 1515689.29,
    Colombia: 2259464.9,
    Ecuador: 991.21,
    Peru: 1284.61,
    Uruguay: 30167.4,
    Venezuela: 147374.24,
    Mexico: 12857.25,
  },
  {
    Def: "Logo HE",
    Plat: "Logo HE",
    Argentina: 212930.54,
    Chile: 484822.8,
    Colombia: 541917.22,
    Ecuador: 300.93,
    Peru: 400.8,
    Uruguay: 17730.49,
    Venezuela: 96463.14,
    Mexico: 3953.13,
  },
  {
    Def: "Logo LE",
    Plat: "Logo LE",
    Argentina: 174274.83,
    Chile: 344256.76,
    Colombia: 206474.71,
    Ecuador: 225.69,
    Peru: 260.35,
    Uruguay: 11511.98,
    Venezuela: 48231.57,
    Mexico: 3488.79,
  },
  {
    Def: "MVS HE",
    Plat: "MVS HE",
    Argentina: 59766.53,
    Chile: 20151.55,
    Colombia: 19686.98,
    Ecuador: 87.68,
    Peru: 94.4,
    Uruguay: 9052.79,
    Venezuela: 23594.39,
    Mexico: 970.3,
  },
  {
    Def: "MVS LE",
    Plat: "MVS LE",
    Argentina: 6061.55,
    Chile: 10579.8,
    Colombia: 17897.25,
    Ecuador: 15.75,
    Peru: 73.5,
    Uruguay: 2502.94,
    Venezuela: 14822.8,
    Mexico: 270.27,
  },
];

const INITIAL_LPLAT_BRAZIL = [
  { Def: "1", Plat: "System Z", Rate: 2803.85 },
  { Def: "2", Plat: "Power HE", Rate: 1516.61 },
  { Def: "3", Plat: "Power LE", Rate: 742.22 },
  { Def: "4Br", Plat: "Storage HE", Rate: 1403.43 },
  { Def: "5Br", Plat: "Storage LE", Rate: 536.45 },
  { Def: "B", Plat: "Demais Produtos - Proxxi", Rate: 83.37 },
  { Def: "J", Plat: "MVS LE", Rate: 130.87 },
  { Def: "L", Plat: "MVS HE", Rate: 361.36 },
];

const INITIAL_LBAND = [
  {
    Def: "B1",
    Plat: "FULL",
    Colombia: 15248.0,
    Brazil: 0,
    Mexico: 0,
    Argentina: 0,
    Chile: 0,
    Ecuador: 0,
    Peru: 0,
    Uruguay: 0,
    Venezuela: 0,
  },
  {
    Def: "B2",
    Plat: "FULL",
    Colombia: 26845.88,
    Brazil: 58.57,
    Mexico: 235.83,
    Argentina: 0,
    Chile: 0,
    Ecuador: 0,
    Peru: 73.64,
    Uruguay: 0,
    Venezuela: 0,
  },
  {
    Def: "B3",
    Plat: "FULL",
    Colombia: 47250.0,
    Brazil: 66.92,
    Mexico: 300.3,
    Argentina: 0,
    Chile: 0,
    Ecuador: 14.88,
    Peru: 99.07,
    Uruguay: 0,
    Venezuela: 0,
  },
  {
    Def: "B4",
    Plat: "FULL",
    Colombia: 60375.0,
    Brazil: 95.66,
    Mexico: 433.13,
    Argentina: 11206.59,
    Chile: 19315.47,
    Ecuador: 27.72,
    Peru: 111.12,
    Uruguay: 0,
    Venezuela: 24810.48,
  },
  {
    Def: "B5",
    Plat: "FULL",
    Colombia: 84525.0,
    Brazil: 109.15,
    Mexico: 471.24,
    Argentina: 14835.74,
    Chile: 28019.38,
    Ecuador: 38.8,
    Peru: 139.39,
    Uruguay: 3195.11,
    Venezuela: 26582.65,
  },
  {
    Def: "B6",
    Plat: "FULL",
    Colombia: 126000.0,
    Brazil: 183.46,
    Mexico: 756.0,
    Argentina: 36257.76,
    Chile: 44265.6,
    Ecuador: 0,
    Peru: 0,
    Uruguay: 0,
    Venezuela: 0,
  },
  {
    Def: "B7",
    Plat: "FULL",
    Colombia: 151200.0,
    Brazil: 222.0,
    Mexico: 900.0,
    Argentina: 42000.0,
    Chile: 0,
    Ecuador: 0,
    Peru: 0,
    Uruguay: 0,
    Venezuela: 0,
  },
  {
    Def: "B8",
    Plat: "FULL",
    Colombia: 176400.0,
    Brazil: 258.0,
    Mexico: 1056.0,
    Argentina: 48000.0,
    Chile: 0,
    Ecuador: 0,
    Peru: 0,
    Uruguay: 0,
    Venezuela: 0,
  },
  {
    Def: "B9",
    Plat: "FULL",
    Colombia: 201600.0,
    Brazil: 294.0,
    Mexico: 1188.0,
    Argentina: 54000.0,
    Chile: 0,
    Ecuador: 0,
    Peru: 0,
    Uruguay: 0,
    Venezuela: 0,
  },
  {
    Def: "B10",
    Plat: "FULL",
    Colombia: 226800.0,
    Brazil: 330.0,
    Mexico: 1320.0,
    Argentina: 60000.0,
    Chile: 0,
    Ecuador: 0,
    Peru: 0,
    Uruguay: 0,
    Venezuela: 0,
  },
];

// --- APP COMPONENT ---
const App = () => {
  const initialDates = getInitialDates();

  // --- 🔒 LOGIN & AUTH STATE ---
  const [isAppLoggedIn, setIsAppLoggedIn] = useState(() => {
    return sessionStorage.getItem("lacostweb_app_logged_in") === "true";
  });
  const [userRole, setUserRole] = useState(() => {
    return sessionStorage.getItem("lacostweb_user_role") || "user";
  });
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");

  // DYNAMIC DATA STATES
  const [dbCountries, setDbCountries] = useState(INITIAL_COUNTRIES);
  const [dbRisk, setDbRisk] = useState(INITIAL_RISK);
  const [dbOffering, setDbOffering] = useState(INITIAL_OFFERING);
  const [dbSlc, setDbSlc] = useState(INITIAL_SLC);
  const [dbLplatGlobal, setDbLplatGlobal] = useState(INITIAL_LPLAT_GLOBAL);
  const [dbLplatBrazil, setDbLplatBrazil] = useState(INITIAL_LPLAT_BRAZIL);
  const [dbLband, setDbLband] = useState(INITIAL_LBAND);

  // AUTH & FIREBASE STATE
  const [user, setUser] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [firebaseConfigInput, setFirebaseConfigInput] = useState("");
  const [masterDataSynced, setMasterDataSynced] = useState(false);

  // NOTIFICATION & MODALS STATE
  const [notification, setNotification] = useState({ show: false, message: "", type: "success" });
  const [confirmModal, setConfirmModal] = useState({ show: false, message: "", action: null });

  // SEARCH MODAL STATES
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // --- UI STATE: COLLAPSIBLE SECTIONS ---
  const [expandedSections, setExpandedSections] = useState({
    services: true,
    management: true,
    suppliers: true,
  });

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // UI STATES
  const [globalConfig, setGlobalConfig] = useState({
    idCotizacion: getQuoteIdFromUrl(),
    customerName: "",
    country: "Colombia",
    currency: "USD",
    exchangeRate: 3775.22,
    risk: "Low",
    contingency: 0.02,
    tax: 0.01,
  });

  const [services, setServices] = useState([
    {
      id: 1,
      offering: dbOffering[0].Offering,
      description: "", 
      slc: "M1A",
      startDate: initialDates.start,
      endDate: initialDates.end,
      duration: 12,
      qty: 1,
      unitCostUSD: 0,
      unitCostLocal: 0,
    },
  ]);

  const [managements, setManagements] = useState([
    {
      id: 1,
      mode: "Machine Category",
      categoryDef: "Mainframe",
      description: "", 
      hours: 0,
      monthlyCost: 0,
      startDate: initialDates.start,
      endDate: initialDates.end,
      duration: 12,
    },
  ]);

  // --- NEW MODULE STATE: SUPPLIERS ---
  const [suppliers, setSuppliers] = useState([
    {
        id: 1,
        vendorName: "",
        frequency: "Monthly", // OTC, Monthly, Annual
        startDate: initialDates.start,
        endDate: initialDates.end,
        duration: 12,
        qty: 1,
        unitCostUSD: 0,
        unitCostLocal: 0
    }
  ]);

  // IMPORT MODAL STATES
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [importTarget, setImportTarget] = useState("OFFERING");
  const [importText, setImportText] = useState("");
  const [importMessage, setImportMessage] = useState({ text: "", type: "" });

  // --- HELPER: NOTIFICATIONS ---
  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ ...notification, show: false }), 4000);
  };

  // --- EFFECT: UPDATE URL ---
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const url = new URL(window.location);
        url.searchParams.set("id", globalConfig.idCotizacion);
        window.history.pushState({}, "", url);
      } catch (e) {
        console.warn("URL update blocked by environment:", e);
      }
    }
  }, [globalConfig.idCotizacion]);

  // --- INIT EFFECT (AUTH) ---
  useEffect(() => {
    if (globalAuth) {
      const unsubscribe = onAuthStateChanged(globalAuth, setUser);
      if (!globalAuth.currentUser) {
        signInAnonymously(globalAuth).catch((e) =>
          console.error("Auto-login error", e)
        );
      }
      return () => unsubscribe();
    }
  }, []);

  // --- 1. LISTENER DE TABLAS MAESTRAS (GLOBAL) ---
  useEffect(() => {
    if (!globalDb) return;
    const masterDocRef = doc(
      globalDb,
      "artifacts",
      appId,
      "public",
      "data",
      "settings",
      "master_tables"
    );
    const unsubscribe = onSnapshot(masterDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.dbCountries) setDbCountries(data.dbCountries);
        if (data.dbRisk) setDbRisk(data.dbRisk);
        if (data.dbOffering) setDbOffering(data.dbOffering);
        if (data.dbSlc) setDbSlc(data.dbSlc);
        if (data.dbLplatGlobal) setDbLplatGlobal(data.dbLplatGlobal);
        if (data.dbLplatBrazil) setDbLplatBrazil(data.dbLplatBrazil);
        if (data.dbLband) setDbLband(data.dbLband);
        setMasterDataSynced(true);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // --- 2. LISTENER DE COTIZACIÓN (INDIVIDUAL) ---
  useEffect(() => {
    if (!user || !globalDb) return;
    
    // Si el ID es nuevo o temporal, no intentamos cargar
    if (globalConfig.idCotizacion === "COT-NUEVA" || globalConfig.idCotizacion.startsWith("COT-TEMP")) return;

    const quoteDocRef = doc(
      globalDb,
      "artifacts",
      appId,
      "public",
      "data",
      "quotes",
      globalConfig.idCotizacion
    );
    const unsubscribe = onSnapshot(quoteDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.services) setServices(data.services);
        if (data.managements) setManagements(data.managements);
        // Cargar Suppliers si existen
        if (data.suppliers) setSuppliers(data.suppliers);
        
        if (data.globalConfig)
          setGlobalConfig((prev) => ({
            ...prev,
            ...data.globalConfig,
            idCotizacion: prev.idCotizacion,
          }));
        if (data.lastUpdated) setLastSaved(new Date(data.lastUpdated));
      }
    });
    return () => unsubscribe();
  }, [user, globalConfig.idCotizacion]);

  // --- HANDLER: LOGIN (Usa sessionStorage) ---
  const handleAppLogin = (e) => {
    e.preventDefault();
    if (loginUser === "Admin" && loginPass === "54321") {
      setUserRole("admin");
      setIsAppLoggedIn(true);
      setLoginError("");
      sessionStorage.setItem("lacostweb_app_logged_in", "true");
      sessionStorage.setItem("lacostweb_user_role", "admin");
      sessionStorage.setItem("lacostweb_user_name", "Admin");
    } else if (loginUser === "User" && loginPass === "12345") {
      setUserRole("user");
      setIsAppLoggedIn(true);
      setLoginError("");
      sessionStorage.setItem("lacostweb_app_logged_in", "true");
      sessionStorage.setItem("lacostweb_user_role", "user");
      sessionStorage.setItem("lacostweb_user_name", "User");
    } else {
      setLoginError("Credenciales inválidas. Intente nuevamente.");
    }
  };

  const handleLogout = () => {
    setIsAppLoggedIn(false);
    setLoginUser("");
    setLoginPass("");
    setUserRole("user");
    // Limpia sessionStorage (efecto de "borrar cookies")
    sessionStorage.removeItem("lacostweb_app_logged_in");
    sessionStorage.removeItem("lacostweb_user_role");
    sessionStorage.removeItem("lacostweb_user_name");
    // Limpieza adicional por seguridad
    localStorage.removeItem("lacostweb_app_logged_in");
  };

  // --- ⚡ HANDLER: SEARCH QUOTES ---
  const handleSearchQuotes = async () => {
    if (!globalDb) return;
    setSearchLoading(true);
    setSearchResults([]);
    
    // Obtener usuario actual para filtrar correctamente
    const currentUserName = sessionStorage.getItem("lacostweb_user_name") || "User";

    try {
      const quotesRef = collection(globalDb, "artifacts", appId, "public", "data", "quotes");
      // Rule 2: No complex queries. Fetch all and filter in memory.
      const querySnapshot = await getDocs(quotesRef);
      const allQuotes = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        allQuotes.push({ 
          id: doc.id, 
          ...data 
        });
      });

      // Filter based on Role and Search Term
      const filtered = allQuotes.filter(q => {
        // Text Match
        const matchesTerm = 
          q.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
          (q.globalConfig?.customerName || "").toLowerCase().includes(searchTerm.toLowerCase());

        // Role Permission
        if (userRole === 'admin') {
          return matchesTerm; // Admin sees all
        } else {
          // User sees only their own (creadas por él mismo)
          return matchesTerm && q.creatorName === currentUserName;
        }
      });

      // Sort by lastUpdated desc
      filtered.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));

      setSearchResults(filtered);
    } catch (e) {
      console.error("Search error:", e);
      showNotification("Error searching quotes", "error");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleOpenQuote = (quoteId) => {
    setGlobalConfig(prev => ({ ...prev, idCotizacion: quoteId }));
    setIsSearchModalOpen(false);
  };

  // --- ⚡ HANDLER: NEW QUOTE (FIXED) ---
  const triggerNewQuote = () => {
      setConfirmModal({
          show: true,
          message: "¿Estás seguro de crear una nueva cotización? Se perderán los cambios no guardados.",
          action: performNewQuote
      });
  };

  const performNewQuote = () => {
        const dates = getInitialDates();
        
        // 1. Force URL Clean first
        if (typeof window !== "undefined") {
            const url = new URL(window.location);
            url.searchParams.set("id", "COT-NUEVA");
            window.history.pushState({}, "", url);
        }

        // 2. Update State to Defaults (Wait a tick to let effects clear)
        setTimeout(() => {
            setServices([
                {
                  id: Date.now(),
                  offering: dbOffering[0]?.Offering || "Service",
                  description: "",
                  slc: "M1A",
                  startDate: dates.start,
                  endDate: dates.end,
                  duration: 12,
                  qty: 1,
                  unitCostUSD: 0,
                  unitCostLocal: 0,
                }
            ]);
            setManagements([
                {
                  id: Date.now() + 1,
                  mode: "Machine Category",
                  categoryDef: "Mainframe",
                  description: "",
                  hours: 0,
                  monthlyCost: 0,
                  startDate: dates.start,
                  endDate: dates.end,
                  duration: 12,
                }
            ]);
            setSuppliers([
                {
                    id: Date.now() + 2,
                    vendorName: "",
                    frequency: "Monthly",
                    startDate: dates.start,
                    endDate: dates.end,
                    duration: 12,
                    qty: 1,
                    unitCostUSD: 0,
                    unitCostLocal: 0
                }
            ]);
            setGlobalConfig(prev => ({
                ...prev,
                idCotizacion: "COT-NUEVA",
                customerName: "",
            }));
            setLastSaved(null);
            showNotification("✨ Nueva cotización iniciada", "success");
        }, 50);
        
        setConfirmModal({ show: false, message: "", action: null });
  };

  // --- ⚡ HANDLER: CLEAR ALL (FIXED) ---
  const triggerClearAll = () => {
    setConfirmModal({
        show: true,
        message: "¿Reiniciar el formulario a valores por defecto?",
        action: performClearAll
    });
  };

  const performClearAll = () => {
      const dates = getInitialDates();
      setServices([
        {
          id: Date.now(),
          offering: dbOffering[0]?.Offering || "Service",
          description: "",
          slc: "M1A",
          startDate: dates.start,
          endDate: dates.end,
          duration: 12,
          qty: 1,
          unitCostUSD: 0,
          unitCostLocal: 0,
        }
      ]);
      setManagements([
        {
          id: Date.now() + 1,
          mode: "Machine Category",
          categoryDef: "Mainframe",
          description: "",
          hours: 0,
          monthlyCost: 0,
          startDate: dates.start,
          endDate: dates.end,
          duration: 12,
        }
      ]);
      setSuppliers([
        {
            id: Date.now() + 2,
            vendorName: "",
            frequency: "Monthly",
            startDate: dates.start,
            endDate: dates.end,
            duration: 12,
            qty: 1,
            unitCostUSD: 0,
            unitCostLocal: 0
        }
      ]);
      setConfirmModal({ show: false, message: "", action: null });
      showNotification("🧹 Formulario reiniciado", "success");
  };

  // --- ⚡ HANDLER: DELETE QUOTE (ADMIN ONLY) ---
  const triggerDeleteQuote = (quoteId, e) => {
    e.stopPropagation();
    setConfirmModal({
      show: true,
      message: `¿Estás seguro de eliminar la cotización ${quoteId}? Esta acción no se puede deshacer.`,
      action: () => performDeleteQuote(quoteId)
    });
  };

  const performDeleteQuote = async (quoteId) => {
    if (!globalDb) return;
    
    try {
      await deleteDoc(doc(globalDb, "artifacts", appId, "public", "data", "quotes", quoteId));
      
      // Update local list
      setSearchResults(prev => prev.filter(q => q.id !== quoteId));
      
      // If deleted quote is current quote, reset to new
      if (globalConfig.idCotizacion === quoteId) {
        performNewQuote();
      }
      
      showNotification(`🗑️ Cotización ${quoteId} eliminada`, "success");
    } catch (error) {
      console.error("Error deleting quote:", error);
      showNotification("Error al eliminar la cotización", "error");
    } finally {
      setConfirmModal({ show: false, message: "", action: null });
    }
  };

  // --- HELPER: SAVE TO CLOUD (WITH AUTO-NUMBERING) ---
  const handleSaveToCloud = async () => {
    if (!user || !globalDb) {
      setLastSaved(new Date());
      showNotification("💾 Guardado LOCALMENTE (Offline).", "warning");
      return;
    }
    try {
      let currentId = globalConfig.idCotizacion;

      // --- LOGICA DE CONSECUTIVO INTELIGENTE (MAX + 1) ---
      const isNewOrTemp = currentId === "COT-NUEVA" || !currentId.match(/^COT-(Adm|Usr)-\d{6}$/);

      if (isNewOrTemp) {
          const quotesRef = collection(globalDb, "artifacts", appId, "public", "data", "quotes");
          const snapshot = await getDocs(quotesRef);
          
          // Buscar el número más alto existente para este rol/prefijo
          let maxNum = 0;
          snapshot.forEach(doc => {
             const parts = doc.id.split('-');
             if (parts.length === 3) {
                 const num = parseInt(parts[2]);
                 if (!isNaN(num) && num > maxNum) maxNum = num;
             }
          });
          
          const nextIndex = maxNum + 1;
          const prefix = userRole === 'admin' ? 'Adm' : 'Usr';
          const sequence = String(nextIndex).padStart(6, '0');
          currentId = `COT-${prefix}-${sequence}`;

          // Actualizamos el estado para reflejar el nuevo ID inmediatamente
          setGlobalConfig(prev => ({ ...prev, idCotizacion: currentId }));
      }

      const quoteDocRef = doc(
        globalDb,
        "artifacts",
        appId,
        "public",
        "data",
        "quotes",
        currentId
      );
      
      // FIX: Leer el usuario de sessionStorage para que coincida con el Login
      const currentCreator = sessionStorage.getItem("lacostweb_user_name") || "Unknown";

      await setDoc(quoteDocRef, {
        services,
        managements,
        suppliers, // Guardar suppliers
        globalConfig: { ...globalConfig, idCotizacion: currentId }, // Aseguramos que el ID coincida
        lastUpdated: new Date().toISOString(),
        savedBy: user.uid, // ID Técnico
        creatorName: currentCreator, // Nombre legible para búsquedas
      });
      setLastSaved(new Date());
      
      // Actualizamos la URL sin recargar
      const url = new URL(window.location);
      url.searchParams.set("id", currentId);
      window.history.pushState({}, "", url);

      showNotification(`☁️ Cotización guardada: ${currentId}`, "success");
    } catch (e) {
      console.error(e);
      showNotification("Error de conexión al guardar.", "error");
    }
  };

  const handleShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    showNotification("🔗 Link copiado!", "success");
  };

  const handleExportData = () => {
    const backupData = {
      dbCountries,
      dbRisk,
      dbOffering,
      dbSlc,
      dbLplatGlobal,
      dbLplatBrazil,
      dbLband,
      exportDate: new Date().toISOString(),
      version: "V50.1-React",
    };
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute(
      "download",
      `lacostweb-tables-${new Date().toISOString().split("T")[0]}.json`
    );
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportData = () => {
    if (!importText.trim()) {
      setImportMessage({ text: "No data.", type: "error" });
      return;
    }
    try {
      const lines = importText.trim().split("\n");
      if (lines.length < 2) throw new Error("Falta cabecera o datos");
      const delimiter = lines[0].includes("\t") ? "\t" : ",";
      const headers = lines[0]
        .split(delimiter)
        .map((h) => h.trim().replace(/^"|"$/g, ""));
      const newData = lines.slice(1).map((line) => {
        const values = line.split(delimiter);
        const obj = {};
        headers.forEach((h, i) => {
          let val = values[i] ? values[i].trim().replace(/^"|"$/g, "") : "";
          if (val !== "" && !isNaN(Number(val.replace(/,/g, ""))))
            obj[h] = Number(val.replace(/,/g, ""));
          else obj[h] = val;
        });
        return obj;
      });

      switch (importTarget) {
        case "OFFERING":
          setDbOffering(newData);
          break;
        case "SLC":
          setDbSlc(newData);
          break;
        case "LPLAT_GLOBAL":
          setDbLplatGlobal(newData);
          break;
        case "LPLAT_BRAZIL":
          setDbLplatBrazil(newData);
          break;
        case "LBAND":
          setDbLband(newData);
          break;
        case "COUNTRIES":
          setDbCountries(newData);
          break;
        case "RISK":
          setDbRisk(newData);
          break;
      }

      setImportMessage({
        text: `Updated ${importTarget} (${newData.length} rows).`,
        type: "success",
      });
      setTimeout(() => {
        setImportText("");
        setIsUploadModalOpen(false);
        setImportMessage({ text: "", type: "" });
      }, 1500);
    } catch (error) {
      setImportMessage({ text: "Error parsing data.", type: "error" });
    }
  };

  const getDisplayCurrency = () => {
    if (globalConfig.currency === "USD") return "USD";
    const c = dbCountries.find((x) => x.Country === globalConfig.country);
    return c ? c.Currency : "USD";
  };
  const displayCurrency = getDisplayCurrency();

  const filteredSLCs = useMemo(
    () =>
      globalConfig.country === "Brazil"
        ? dbSlc
        : dbSlc.filter((i) => i.Scope !== "only Brazil"),
    [globalConfig.country, dbSlc]
  );
  const activeLPLAT = useMemo(
    () => (globalConfig.country === "Brazil" ? dbLplatBrazil : dbLplatGlobal),
    [globalConfig.country, dbLplatBrazil, dbLplatGlobal]
  );

  useEffect(() => {
    const c = dbCountries.find((x) => x.Country === globalConfig.country);
    if (c) setGlobalConfig((p) => ({ ...p, exchangeRate: c.ER, tax: c.Tax }));
  }, [globalConfig.country, dbCountries]);
  useEffect(() => {
    const r = dbRisk.find((x) => x.Risk === globalConfig.risk);
    if (r) setGlobalConfig((p) => ({ ...p, contingency: r.Contingency }));
  }, [globalConfig.risk, dbRisk]);

  const handleGlobalChange = (f, v) =>
    setGlobalConfig((p) => ({ ...p, [f]: v }));
  const calculateDuration = (s, e) => {
    if (!s || !e) return 0;
    const d1 = new Date(s),
      d2 = new Date(e);
    let m =
      (d2.getFullYear() - d1.getFullYear()) * 12 +
      (d2.getMonth() - d1.getMonth());
    if (d2.getDate() < d1.getDate()) m--;
    return Math.max(0, m);
  };
  const updateService = (id, f, v) =>
    setServices(
      services.map((s) =>
        s.id === id
          ? {
              ...s,
              [f]: v,
              duration:
                f === "startDate" || f === "endDate"
                  ? calculateDuration(
                      f === "startDate" ? v : s.startDate,
                      f === "endDate" ? v : s.endDate
                    )
                  : s.duration,
            }
          : s
      )
    );
  const calculateServiceTotal = (s) => {
    let cost =
      globalConfig.currency === "USD"
        ? s.unitCostUSD + s.unitCostLocal / globalConfig.exchangeRate
        : s.unitCostUSD * globalConfig.exchangeRate + s.unitCostLocal;
    const uplf =
      (globalConfig.country === "Brazil"
        ? dbSlc.find((i) => i.SLC === s.slc && i.Scope === "only Brazil")
        : dbSlc.find((i) => i.SLC === s.slc && i.Scope !== "only Brazil")
      )?.UPLF || 1;
    return cost * s.duration * s.qty * uplf;
  };
  const getManagementRate = (def, mode) => {
    const db = mode === "Machine Category" ? activeLPLAT : dbLband;
    const item = db.find((d) => d.Def === def);
    if (!item) return 0;
    if (globalConfig.country === "Brazil" && mode === "Machine Category")
      return parseRawFloat(item.Rate);
    return parseRawFloat(
      item[
        globalConfig.country === "Brazil" ? "Brazil" : globalConfig.country
      ] || 0
    );
  };
  const updateManagement = (id, f, v) =>
    setManagements(
      managements.map((m) => {
        if (m.id !== id) return m;
        const u = { ...m, [f]: v };
        if (f === "mode")
          u.categoryDef = (
            v === "Machine Category" ? activeLPLAT : dbLband
          )[0]?.Def;
        if (f === "startDate" || f === "endDate")
          u.duration = calculateDuration(
            f === "startDate" ? v : m.startDate,
            f === "endDate" ? v : m.endDate
          );
        return u;
      })
    );
  const calculateManagementTotal = (m) => {
    const r = getManagementRate(m.categoryDef, m.mode);
    const rateConverted =
      globalConfig.currency === "USD" ? r / globalConfig.exchangeRate : r;
    return rateConverted * m.hours * m.duration;
  };

  // --- LOGIC: UPDATE SUPPLIER ---
  const updateSupplier = (id, f, v) => {
      setSuppliers(suppliers.map(s => {
          if (s.id !== id) return s;
          const u = { ...s, [f]: v };
          if (f === "startDate" || f === "endDate") {
              u.duration = calculateDuration(
                  f === "startDate" ? v : s.startDate,
                  f === "endDate" ? v : s.endDate
              );
          }
          return u;
      }));
  };

  // --- LOGIC: CALCULATE SUPPLIER TOTAL ---
  const calculateSupplierTotal = (s) => {
      // 1. Convert Local Cost based on global currency setting
      let baseUnitCost;
      
      if (globalConfig.currency === "USD") {
          // If Global is USD: Local input is converted to USD
          baseUnitCost = s.unitCostUSD + (s.unitCostLocal / globalConfig.exchangeRate);
      } else {
          // If Global is Local: USD input is converted to Local
          baseUnitCost = (s.unitCostUSD * globalConfig.exchangeRate) + s.unitCostLocal;
      }

      // 2. Apply Formula based on Frequency
      if (s.frequency === "OTC") {
          return baseUnitCost * s.qty;
      } else if (s.frequency === "Monthly") {
          return baseUnitCost * s.qty * s.duration;
      } else if (s.frequency === "Annual") {
          return baseUnitCost * s.qty * (s.duration / 12);
      }
      return 0;
  };


  const totalServices = services.reduce(
    (a, s) => a + calculateServiceTotal(s),
    0
  );
  const totalManagement = managements.reduce(
    (a, m) => a + calculateManagementTotal(m),
    0
  );
  
  // Nuevo total suppliers
  const totalSuppliers = suppliers.reduce(
    (a, s) => a + calculateSupplierTotal(s),
    0
  );

  const subTotal = totalServices + totalManagement + totalSuppliers;
  const contingencyAmount = subTotal * globalConfig.contingency;
  const taxAmount = subTotal * globalConfig.tax;
  const grandTotal = subTotal + contingencyAmount + taxAmount;

  const totalContractDuration = Math.max(
    services.reduce((max, s) => Math.max(max, s.duration || 0), 0),
    managements.reduce((max, m) => Math.max(max, m.duration || 0), 0),
    suppliers.reduce((max, s) => Math.max(max, s.duration || 0), 0)
  );

  const chartData = [
    {
      name: "Services",
      value: totalServices,
      label:
        grandTotal > 0
          ? `${((totalServices / grandTotal) * 100).toFixed(0)}%`
          : "0%",
    },
    {
      name: "Management",
      value: totalManagement,
      label:
        grandTotal > 0
          ? `${((totalManagement / grandTotal) * 100).toFixed(0)}%`
          : "0%",
    },
    {
      name: "Suppliers", // New Bar
      value: totalSuppliers,
      label:
        grandTotal > 0
          ? `${((totalSuppliers / grandTotal) * 100).toFixed(0)}%`
          : "0%",
    },
    {
      name: "Risk",
      value: contingencyAmount,
      label: `${(globalConfig.contingency * 100).toFixed(1)}%`, 
    },
    {
      name: "Tax",
      value: taxAmount,
      label: `${(globalConfig.tax * 100).toFixed(1)}%`,
    },
  ];

  if (!isAppLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md border border-slate-200">
          <div className="flex justify-center mb-8">
            <IbmLogo />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 text-center mb-2">
            LACOSTWEB V52.3
          </h2>
          <p className="text-slate-500 text-center mb-6 text-sm">
            Please sign in to continue
          </p>

          <form onSubmit={handleAppLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                Username
              </label>
              <div className="relative">
                <User
                  className="absolute left-3 top-2.5 text-slate-400"
                  size={18}
                />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Admin or User"
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-2.5 text-slate-400"
                  size={18}
                />
                <input
                  type="password"
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="•••••"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                />
              </div>
            </div>

            {loginError && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded border border-red-100 flex items-center">
                <AlertCircle size={14} className="mr-2" />
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-blue-200"
            >
              Access Dashboard
            </button>
          </form>
          <div className="mt-6 text-center text-xs text-slate-400">
            Protected System • IBM Confidential
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN APP RENDER ---
  return (
    <div className="min-h-screen pb-32 relative bg-slate-50 p-4">
      
      {/* --- NOTIFICATION TOAST --- */}
      {notification.show && (
          <div className={`fixed top-4 right-4 z-[100] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce-in
              ${notification.type === 'error' ? 'bg-red-600 text-white' : 
                notification.type === 'warning' ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'}`}>
              <Info size={20} />
              <span className="font-bold">{notification.message}</span>
          </div>
      )}

      {/* --- CONFIRMATION MODAL --- */}
      {confirmModal.show && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border-2 border-indigo-100 transform scale-100 transition-all">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Confirm Action</h3>
                <p className="text-slate-600 mb-6">{confirmModal.message}</p>
                <div className="flex gap-3 justify-end">
                    <button 
                        onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                        className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmModal.action}
                        className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition"
                    >
                        Confirm
                    </button>
                </div>
            </div>
          </div>
      )}
      
      {/* --- SEARCH MODAL (IMPROVED LIST VIEW) --- */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-8 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden mt-10">
            <div className="bg-indigo-600 p-6 flex justify-between items-center text-white">
              <h3 className="font-bold text-xl flex items-center gap-2">
                <List size={24} /> Search Quotes (List Mode)
              </h3>
              <button onClick={() => setIsSearchModalOpen(false)} className="hover:bg-indigo-700 p-1 rounded">
                <X />
              </button>
            </div>
            <div className="p-6 bg-slate-50 border-b">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 text-slate-400" size={20} />
                  <input
                    className="w-full pl-10 p-3 border rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Search by ID or Customer Name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchQuotes()}
                  />
                </div>
                <button 
                  onClick={handleSearchQuotes}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition"
                >
                  Search
                </button>
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto bg-white">
              {searchLoading ? (
                <div className="text-center py-10 text-slate-500">Loading...</div>
              ) : searchResults.length > 0 ? (
                <table className="w-full text-sm text-left">
                  <thead className="bg-indigo-50 text-indigo-800 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 font-bold">Quote ID</th>
                      <th className="px-6 py-3 font-bold">Customer</th>
                      <th className="px-6 py-3 font-bold">Updated</th>
                      {userRole === 'admin' && <th className="px-6 py-3 font-bold">Creator</th>}
                      <th className="px-6 py-3 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((item) => (
                      <tr 
                        key={item.id}
                        className="border-b hover:bg-slate-50 transition cursor-pointer"
                        onClick={() => handleOpenQuote(item.id)}
                      >
                        <td className="px-6 py-4 font-bold text-indigo-900 font-mono">
                          {item.id}
                        </td>
                        <td className="px-6 py-4 text-slate-700">
                          {item.globalConfig?.customerName || "No Name"}
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {new Date(item.lastUpdated || Date.now()).toLocaleDateString()}
                        </td>
                        {userRole === 'admin' && (
                          <td className="px-6 py-4">
                            <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-bold">
                              {item.creatorName || "Unknown"}
                            </span>
                          </td>
                        )}
                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                          <button 
                            className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded hover:bg-indigo-200 font-bold text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenQuote(item.id);
                            }}
                          >
                            Open
                          </button>
                          
                          {/* --- BOTÓN DE ELIMINAR (SOLO ADMIN) --- */}
                          {userRole === 'admin' && (
                            <button 
                              className="bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 border border-red-200"
                              onClick={(e) => triggerDeleteQuote(item.id, e)}
                              title="Delete Quote"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-10 text-slate-400 flex flex-col items-center">
                  <Database size={48} className="mb-2 opacity-20" />
                  No results found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showConfigModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-amber-600 p-4 flex justify-between items-center text-white font-bold">
              <h3>Configurar Firebase</h3>
              <button onClick={() => setShowConfigModal(false)}>
                <X />
              </button>
            </div>
            <div className="p-6">
              <textarea
                className="w-full h-32 p-3 border rounded font-mono text-xs mb-4"
                value={firebaseConfigInput}
                onChange={(e) => setFirebaseConfigInput(e.target.value)}
                placeholder="JSON Config..."
              ></textarea>
            </div>
          </div>
        </div>
      )}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="bg-indigo-600 p-4 flex justify-between items-center text-white font-bold">
              <h3>Import Data (Global)</h3>
              <button onClick={() => setIsUploadModalOpen(false)}>
                <X />
              </button>
            </div>
            <div className="p-6">
              <select
                className="w-full p-2 border mb-4"
                value={importTarget}
                onChange={(e) => setImportTarget(e.target.value)}
              >
                <option value="OFFERING">Offering</option>
                <option value="SLC">SLC</option>
                <option value="LPLAT_GLOBAL">LPLAT Global</option>
                <option value="LPLAT_BRAZIL">LPLAT Brazil</option>
                <option value="LBAND">LBAND</option>
                <option value="COUNTRIES">Countries</option>
                <option value="RISK">Risk</option>
              </select>
              <textarea
                className="w-full h-48 p-3 border rounded font-mono text-xs mb-4"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste Excel..."
              ></textarea>
              <button
                onClick={handleImportData}
                className="w-full bg-indigo-600 text-white py-2 rounded font-bold"
              >
                Update Global Table
              </button>
              {importMessage.text && (
                <div className="text-green-600 mt-2 font-bold">
                  {importMessage.text}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold flex gap-3 text-slate-900">
              <IbmLogo /> IBM Costing V52.3
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="font-bold text-sm text-slate-500">ID:</span>
              <input
                className="bg-slate-100 border px-2 rounded w-36 font-mono font-bold text-indigo-700"
                value={globalConfig.idCotizacion}
                readOnly
              />
              
              {/* --- ⚡ BOTÓN NUEVO (CON TRIGGER MODAL) --- */}
              <button
                onClick={triggerNewQuote}
                className="bg-emerald-600 text-white px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1 hover:bg-emerald-700 transition shadow-sm"
                title="Create New Quote"
              >
                <Plus size={14} /> New
              </button>

              {/* --- ⚡ BOTÓN DE BÚSQUEDA CORREGIDO --- */}
              <button
                onClick={() => {
                  setSearchTerm("");       // Limpiar término anterior
                  setSearchResults([]);    // Limpiar resultados anteriores
                  setIsSearchModalOpen(true);
                }}
                className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1 border border-indigo-200 hover:bg-indigo-200 transition"
              >
                <Search size={14} /> Find Quote
              </button>

              <button
                onClick={handleShareLink}
                className="bg-blue-100 text-blue-700 px-2 rounded text-xs font-bold py-1"
              >
                <LinkIcon size={12} /> Copiar Link
              </button>
              <span
                className={`text-xs px-2 py-0.5 rounded-full border flex items-center ${
                  user
                    ? "text-green-600 bg-green-50"
                    : "text-amber-600 bg-amber-50"
                }`}
              >
                {user ? (
                  <>
                    <Wifi size={12} className="mr-1" /> Cloud
                  </>
                ) : (
                  <>
                    <AlertCircle size={12} className="mr-1" /> Offline
                  </>
                )}
              </span>
              {masterDataSynced && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center">
                  <Globe size={10} className="mr-1" /> Global Tables Synced
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-4 items-center">
            {/* --- ADMIN ONLY BUTTONS --- */}
            {userRole === "admin" && (
              <>
                <button
                  onClick={handleExportData}
                  className="flex gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-slate-50"
                >
                  <Download size={16} /> Export
                </button>
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="flex gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700"
                >
                  <Upload size={16} /> Update Tables
                </button>
              </>
            )}

            <button
              onClick={triggerClearAll}
              className="flex gap-2 px-4 py-2 text-red-600 border border-red-100 bg-red-50 rounded-lg hover:bg-red-100 text-sm font-bold"
            >
              <RefreshCcw size={16} /> Clear
            </button>

            {/* --- LOGOUT BUTTON --- */}
            <button
              onClick={handleLogout}
              className="flex gap-2 px-4 py-2 text-slate-600 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 text-sm font-medium transition"
            >
              <LogOut size={16} /> Salir
            </button>

            <div className="text-right border-l pl-4 ml-2">
              <div className="text-xs font-bold text-green-800">TOTAL</div>
              <div className="text-3xl font-bold text-green-700">
                ${formatCurrency(grandTotal)}
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-100">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              Country
            </label>
            <select
              className="w-full p-2 border rounded"
              value={globalConfig.country}
              onChange={(e) => handleGlobalChange("country", e.target.value)}
            >
              {dbCountries.map((c) => (
                <option key={c.Country} value={c.Country}>
                  {c.Country}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              Currency
            </label>
            <select
              className="w-full p-2 border rounded"
              value={globalConfig.currency}
              onChange={(e) => handleGlobalChange("currency", e.target.value)}
            >
              <option value="USD">USD</option>
              <option value="Local">Local</option>
            </select>
            {globalConfig.currency === "Local" && (
              <div className="text-xs text-slate-400 mt-1 font-mono">
                E/R: {globalConfig.exchangeRate}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              Risk
            </label>
            <select
              className="w-full p-2 border rounded"
              value={globalConfig.risk}
              onChange={(e) => handleGlobalChange("risk", e.target.value)}
            >
              {dbRisk.map((r) => (
                <option key={r.Risk} value={r.Risk}>
                  {r.Risk}
                </option>
              ))}
            </select>
            <div className="text-xs text-slate-400 mt-1 font-mono">
              Contingency: {(globalConfig.contingency * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              Customer
            </label>
            <input
              className="w-full p-2 border rounded"
              value={globalConfig.customerName}
              onChange={(e) =>
                handleGlobalChange("customerName", e.target.value)
              }
              placeholder="Name..."
            />
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center">
            <div 
                className="flex items-center gap-3 cursor-pointer group" 
                onClick={() => toggleSection('services')}
            >
                <div className="text-slate-400 group-hover:text-indigo-600 transition">
                    {expandedSections.services ? <Minus size={20} /> : <Plus size={20} />}
                </div>
                <h3 className="font-bold text-lg flex gap-2 select-none text-slate-800 group-hover:text-indigo-700">
                  <Database className="text-indigo-600" /> Services
                </h3>
            </div>
            
            {expandedSections.services && (
                <button
                  onClick={() =>
                    setServices([
                      ...services,
                      {
                        id: Date.now(),
                        offering: dbOffering[0].Offering,
                        description: "",
                        slc: "M1A",
                        startDate: initialDates.start,
                        endDate: initialDates.end,
                        duration: 12,
                        qty: 1,
                        unitCostUSD: 0,
                        unitCostLocal: 0,
                      },
                    ])
                  }
                  className="bg-indigo-600 text-white px-3 py-1 rounded text-sm font-bold shadow-sm hover:bg-indigo-700 transition"
                >
                  + Add
                </button>
            )}
          </div>
          
          {expandedSections.services && (
              <div className="overflow-auto pb-4 transition-all duration-300 ease-in-out">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 w-[25%] text-left">Description</th> {/* MOVED FIRST */}
                      <th className="px-4 py-3 w-[20%] text-left">Offering</th>
                      <th className="px-4 py-3 w-[7%] text-left">SLC</th>
                      <th className="px-4 py-3 text-right w-[9%]">Start</th>
                      <th className="px-4 py-3 text-right w-[9%]">End</th>
                      <th className="px-4 py-3 text-center w-[3%]">Dur</th>
                      <th className="px-4 py-3 text-center w-[5%]">Qty</th>
                      {/* --- COLUMNAS DE COSTOS --- */}
                      <th className="px-4 py-3 text-right w-[8%]">USD Cost</th>
                      <th className="px-4 py-3 text-right w-[8%]">Local Cost</th>
                      <th className="px-4 py-3 text-right w-[8%]">Total</th>
                      <th className="px-4 py-3 w-[3%] text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        {/* DESCRIPTION MOVED FIRST */}
                        <td className="px-4 py-3">
                            <input
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1"
                                placeholder="Description..."
                                value={s.description}
                                onChange={(e) => updateService(s.id, "description", e.target.value)}
                            />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            className="w-full bg-transparent text-ellipsis overflow-hidden"
                            value={s.offering}
                            onChange={(e) =>
                              updateService(s.id, "offering", e.target.value)
                            }
                          >
                            {dbOffering.map((o, i) => (
                              <option key={i} value={o.Offering}>
                                {o.Offering}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            className="w-full bg-transparent"
                            value={s.slc}
                            onChange={(e) =>
                              updateService(s.id, "slc", e.target.value)
                            }
                          >
                            {filteredSLCs.map((l, i) => (
                              <option key={i} value={l.SLC}>
                                {l.SLC}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="date"
                            className="w-full bg-transparent text-right"
                            value={s.startDate}
                            onChange={(e) =>
                              updateService(s.id, "startDate", e.target.value)
                            }
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="date"
                            className="w-full bg-transparent text-right"
                            value={s.endDate}
                            onChange={(e) =>
                              updateService(s.id, "endDate", e.target.value)
                            }
                          />
                        </td>
                        <td className="px-4 py-3 text-center font-mono">
                          {s.duration}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            className="w-full bg-slate-100 rounded text-center px-1 py-1"
                            value={s.qty}
                            onChange={(e) =>
                              updateService(s.id, "qty", Number(e.target.value))
                            }
                          />
                        </td>
                        {/* --- INPUT COSTO USD --- */}
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            className="w-full bg-slate-100 rounded text-right px-2 py-1 border border-slate-200"
                            placeholder="USD"
                            value={s.unitCostUSD}
                            onChange={(e) =>
                              updateService(
                                s.id,
                                "unitCostUSD",
                                Number(e.target.value)
                              )
                            }
                          />
                        </td>
                        {/* --- INPUT COSTO LOCAL (NUEVO) --- */}
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            className="w-full bg-slate-100 rounded text-right px-2 py-1 border border-slate-200"
                            placeholder="Local"
                            value={s.unitCostLocal}
                            onChange={(e) =>
                              updateService(
                                s.id,
                                "unitCostLocal",
                                Number(e.target.value)
                              )
                            }
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-indigo-700">
                          {formatCurrency(calculateServiceTotal(s))}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() =>
                              setServices(services.filter((x) => x.id !== s.id))
                            }
                            className="text-red-400 hover:text-red-600 transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center">
            <div 
                className="flex items-center gap-3 cursor-pointer group" 
                onClick={() => toggleSection('management')}
            >
                <div className="text-slate-400 group-hover:text-orange-600 transition">
                    {expandedSections.management ? <Minus size={20} /> : <Plus size={20} />}
                </div>
                <h3 className="font-bold text-lg flex gap-2 select-none text-slate-800 group-hover:text-orange-700">
                  <Settings className="text-orange-600" /> Management
                </h3>
            </div>

            {expandedSections.management && (
                <button
                  onClick={() =>
                    setManagements([
                      ...managements,
                      {
                        id: Date.now(),
                        mode: "Machine Category",
                        categoryDef: activeLPLAT[0].Def,
                        description: "",
                        hours: 0,
                        startDate: initialDates.start,
                        endDate: initialDates.end,
                        duration: 12,
                      },
                    ])
                  }
                  className="bg-orange-600 text-white px-3 py-1 rounded text-sm font-bold shadow-sm hover:bg-orange-700 transition"
                >
                  + Add
                </button>
            )}
          </div>
          
          {expandedSections.management && (
              <div className="overflow-auto pb-4 transition-all duration-300 ease-in-out">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 w-[25%] text-left">Description</th> {/* MOVED FIRST */}
                      <th className="px-4 py-3 w-[15%] text-left">Mode</th>
                      <th className="px-4 py-3 w-[18%] text-left">Selection</th>
                      <th className="px-4 py-3 text-right w-[9%]">Start</th>
                      <th className="px-4 py-3 text-right w-[9%]">End</th>
                      <th className="px-4 py-3 text-center w-[3%]">Dur</th>
                      <th className="px-4 py-3 text-right w-[7%]">Rate</th>
                      <th className="px-4 py-3 text-right w-[6%]">Hours</th>
                      <th className="px-4 py-3 text-right w-[10%]">Total</th>
                      <th className="px-4 py-3 w-[3%] text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {managements.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        {/* DESCRIPTION MOVED FIRST */}
                        <td className="px-4 py-3">
                            <input
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1"
                                placeholder="Description..."
                                value={m.description}
                                onChange={(e) => updateManagement(m.id, "description", e.target.value)}
                            />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-4">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                className="accent-orange-600"
                                checked={m.mode === "Machine Category"}
                                onChange={() =>
                                  updateManagement(m.id, "mode", "Machine Category")
                                }
                              />
                              <span className="text-[10px] font-bold text-slate-600">
                                M.CAT
                              </span>
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                className="accent-orange-600"
                                checked={m.mode === "Brand Rate Full"}
                                onChange={() =>
                                  updateManagement(m.id, "mode", "Brand Rate Full")
                                }
                              />
                              <span className="text-[10px] font-bold text-slate-600">
                                B.RATE
                              </span>
                            </label>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            className="w-full bg-transparent"
                            value={m.categoryDef}
                            onChange={(e) =>
                              updateManagement(m.id, "categoryDef", e.target.value)
                            }
                          >
                            {(m.mode === "Machine Category"
                              ? activeLPLAT
                              : dbLband
                            ).map((o, i) => (
                              <option key={i} value={o.Def}>
                                {o.Def} - {o.Plat}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="date"
                            className="w-full bg-transparent text-right"
                            value={m.startDate}
                            onChange={(e) =>
                              updateManagement(m.id, "startDate", e.target.value)
                            }
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="date"
                            className="w-full bg-transparent text-right"
                            value={m.endDate}
                            onChange={(e) =>
                              updateManagement(m.id, "endDate", e.target.value)
                            }
                          />
                        </td>
                        <td className="px-4 py-3 text-center font-mono">
                          {m.duration}
                        </td>

                        <td className="px-4 py-3 text-right font-mono text-slate-500">
                          {formatCurrency(
                            getManagementRate(m.categoryDef, m.mode)
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            className="w-full bg-slate-100 rounded text-right px-2 py-1"
                            value={m.hours}
                            onChange={(e) =>
                              updateManagement(
                                m.id,
                                "hours",
                                Number(e.target.value)
                              )
                            }
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-orange-700">
                          {formatCurrency(calculateManagementTotal(m))}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() =>
                              setManagements(
                                managements.filter((x) => x.id !== m.id)
                              )
                            }
                            className="text-red-400 hover:text-red-600 transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          )}
        </div>

        {/* --- NEW MODULE: SUPPLIERS --- */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center">
            <div 
                className="flex items-center gap-3 cursor-pointer group" 
                onClick={() => toggleSection('suppliers')}
            >
                <div className="text-slate-400 group-hover:text-teal-600 transition">
                    {expandedSections.suppliers ? <Minus size={20} /> : <Plus size={20} />}
                </div>
                <h3 className="font-bold text-lg flex gap-2 select-none text-slate-800 group-hover:text-teal-700">
                  <Truck className="text-teal-600" /> Suppliers
                </h3>
            </div>

            {expandedSections.suppliers && (
                <button
                  onClick={() =>
                    setSuppliers([
                      ...suppliers,
                      {
                        id: Date.now(),
                        vendorName: "",
                        frequency: "Monthly",
                        startDate: initialDates.start,
                        endDate: initialDates.end,
                        duration: 12,
                        qty: 1,
                        unitCostUSD: 0,
                        unitCostLocal: 0
                      },
                    ])
                  }
                  className="bg-teal-600 text-white px-3 py-1 rounded text-sm font-bold shadow-sm hover:bg-teal-700 transition"
                >
                  + Add
                </button>
            )}
          </div>
          
          {expandedSections.suppliers && (
              <div className="overflow-auto pb-4 transition-all duration-300 ease-in-out">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 w-[25%] text-left">Vendor Name</th>
                      <th className="px-4 py-3 w-[15%] text-left">Frequency</th>
                      <th className="px-4 py-3 text-right w-[9%]">Start</th>
                      <th className="px-4 py-3 text-right w-[9%]">End</th>
                      <th className="px-4 py-3 text-center w-[3%]">Dur</th>
                      <th className="px-4 py-3 text-center w-[5%]">Qty</th>
                      <th className="px-4 py-3 text-right w-[8%]">USD Unit</th>
                      <th className="px-4 py-3 text-right w-[8%]">Local Unit</th>
                      <th className="px-4 py-3 text-right w-[10%]">Total</th>
                      <th className="px-4 py-3 w-[3%] text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                            <input
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1"
                                placeholder="Vendor Name"
                                value={s.vendorName}
                                onChange={(e) => updateSupplier(s.id, "vendorName", e.target.value)}
                            />
                        </td>
                        <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                                <label className="flex items-center gap-1 cursor-pointer text-xs">
                                    <input 
                                        type="radio" 
                                        name={`freq-${s.id}`}
                                        checked={s.frequency === "OTC"}
                                        onChange={() => updateSupplier(s.id, "frequency", "OTC")}
                                        className="accent-teal-600"
                                    /> OTC
                                </label>
                                <label className="flex items-center gap-1 cursor-pointer text-xs">
                                    <input 
                                        type="radio" 
                                        name={`freq-${s.id}`}
                                        checked={s.frequency === "Monthly"}
                                        onChange={() => updateSupplier(s.id, "frequency", "Monthly")}
                                        className="accent-teal-600"
                                    /> Monthly
                                </label>
                                <label className="flex items-center gap-1 cursor-pointer text-xs">
                                    <input 
                                        type="radio" 
                                        name={`freq-${s.id}`}
                                        checked={s.frequency === "Annual"}
                                        onChange={() => updateSupplier(s.id, "frequency", "Annual")}
                                        className="accent-teal-600"
                                    /> Annual
                                </label>
                            </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="date"
                            className="w-full bg-transparent text-right"
                            value={s.startDate}
                            onChange={(e) => updateSupplier(s.id, "startDate", e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="date"
                            className="w-full bg-transparent text-right"
                            value={s.endDate}
                            onChange={(e) => updateSupplier(s.id, "endDate", e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-3 text-center font-mono">
                          {s.duration}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            className="w-full bg-slate-100 rounded text-center px-1 py-1"
                            value={s.qty}
                            onChange={(e) => updateSupplier(s.id, "qty", Number(e.target.value))}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            className="w-full bg-slate-100 rounded text-right px-2 py-1"
                            placeholder="USD"
                            value={s.unitCostUSD}
                            onChange={(e) => updateSupplier(s.id, "unitCostUSD", Number(e.target.value))}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            className="w-full bg-slate-100 rounded text-right px-2 py-1"
                            placeholder="Local"
                            value={s.unitCostLocal}
                            onChange={(e) => updateSupplier(s.id, "unitCostLocal", Number(e.target.value))}
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-teal-700">
                          {formatCurrency(calculateSupplierTotal(s))}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setSuppliers(suppliers.filter((x) => x.id !== s.id))}
                            className="text-red-400 hover:text-red-600 transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <h3 className="font-bold mb-4 flex gap-2">
              <TrendingUp className="text-green-500" /> Financial Summary
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          ["#3b82f6", "#f97316", "#0d9488", "#eab308", "#64748b"][ // Added Teal for Suppliers
                            index % 5
                          ]
                        }
                      />
                    ))}
                    <LabelList
                      dataKey="label"
                      position="center"
                      fill="black"
                      style={{ fontWeight: "bold" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* --- ⚡ CUADRO DE TOTALES REDISEÑADO --- */}
          <div className="bg-indigo-50 border border-indigo-100 p-8 rounded-2xl flex flex-col justify-between h-full">
            {/* 1. Header con Duración */}
            <div className="flex justify-between items-center border-b border-indigo-200 pb-4 mb-4">
              <span className="text-sm font-bold text-indigo-900 flex gap-2 items-center">
                <Clock size={18} className="text-indigo-500" /> Contract
                Duration
              </span>
              <span className="text-xl font-bold text-indigo-700">
                {totalContractDuration} Months
              </span>
            </div>

            {/* 2. Breakdown */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 text-sm">Services</span>
                <span className="font-bold text-slate-800">
                  ${formatCurrency(totalServices)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 text-sm">Management</span>
                <span className="font-bold text-slate-800">
                  ${formatCurrency(totalManagement)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 text-sm">Suppliers</span>
                <span className="font-bold text-slate-800">
                  ${formatCurrency(totalSuppliers)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-amber-600 text-sm flex items-center gap-1">
                  <AlertCircle size={12} /> Risk (Contingency)
                </span>
                <span className="font-medium text-amber-700">
                  ${formatCurrency(contingencyAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-sm">Tax</span>
                <span className="font-medium text-slate-600">
                  ${formatCurrency(taxAmount)}
                </span>
              </div>
            </div>

            {/* 3. Grand Total Footer */}
            <div className="pt-6 border-t border-indigo-200 mt-6">
              <div className="flex justify-between items-end mb-6">
                <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  Grand Total
                </div>
                <div className="text-3xl font-black text-indigo-900">
                  ${formatCurrency(grandTotal)}
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2">
                <button
                    onClick={triggerNewQuote}
                    className="col-span-1 bg-white border border-indigo-200 text-indigo-600 rounded-xl font-bold flex items-center justify-center hover:bg-indigo-50 transition"
                    title="Nueva Cotización"
                >
                    <Plus size={24} />
                </button>
                <button
                    onClick={handleSaveToCloud}
                    className="col-span-4 bg-indigo-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
                >
                    <Cloud size={20} /> Save Quote
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
