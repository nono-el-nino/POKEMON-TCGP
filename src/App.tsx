import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  CloudOff,
  Crown,
  Download,
  Grid2X2,
  Heart,
  Info,
  Layers,
  List,
  LoaderCircle,
  Maximize2,
  Plus,
  Pencil,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  cardImageUrl,
  EMPTY,
  rarityLabel,
  rarityName,
  slotKey,
  standardRarities,
  typeColors,
  typeNames,
  type Card,
  type Catalog,
  type Collection,
  type Mode,
} from "./model";
import { parseCollection, cleanCollection, STORAGE_KEY } from "./storage.mjs";
import { download, exportPNG } from "./export";
import { exportResultPNG } from "./share";
import ProfilePanel, { ScoreBars } from "./components/ProfilePanel";
import { isEligibleCard } from "./eligibility.mjs";
import { computeProfile } from "./personality.mjs";

function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    const previous = document.activeElement as HTMLElement;
    d.showModal();
    const scroll = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      d.close();
      document.body.style.overflow = scroll;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "modal-wide" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label={title}
    >
      <div className="modal-heading">
        <div>
          <span className="eyebrow">À VOUS DE CHOISIR</span>
          <h2>{title}</h2>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Fermer">
          <X size={22} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function CardImage({ card, eager = false }: { card: Card; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [card.image]);
  return failed ? (
    <div className="image-fallback">
      <CloudOff size={24} />
      <span>Illustration indisponible</span>
      <small>{card.id.toUpperCase()}</small>
      <small>Rouvrez la galerie pour réessayer</small>
    </div>
  ) : (
    <img
      src={cardImageUrl(card)}
      alt={`${card.name} — ${card.id.toUpperCase()}, ${rarityName(card.rarity)}`}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [loadError, setLoadError] = useState(false),
    [reload, setReload] = useState(0);
  const [collection, setCollection] = useState<Collection | null>(null),
    [storageError, setStorageError] = useState(false);
  const [view, setView] = useState<"matrix" | "favorites">("matrix"),
    [mode, setMode] = useState<Mode>("set"),
    [layout, setLayout] = useState<"grid" | "list">("grid");
  const [toast, setToast] = useState(""),
    [modal, setModal] = useState<"help" | "export" | null>(null),
    [zoom, setZoom] = useState<Card | null>(null),
    [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [query, setQuery] = useState(""),
    [setFilter, setSetFilter] = useState(""),
    [rarityFilter, setRarityFilter] = useState(""),
    [typeFilter, setTypeFilter] = useState("");
  const [folded, setFolded] = useState<string[]>([]),
    [exporting, setExporting] = useState(false),
    [summaryGroup, setSummaryGroup] = useState<"set" | "type" | "rarity">(
      "set",
    );
  const [legacyBackup, setLegacyBackup] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null),
    matrixRef = useRef<HTMLElement>(null);
  useEffect(() => {
    let alive = true;
    setLoadError(false);
    Promise.all(
      ["catalog.json", "profiles.json"].map((file) =>
        fetch(`${import.meta.env.BASE_URL}data/${file}`, { cache: "no-cache" }).then((r) => {
          if (!r.ok) throw Error();
          return r.json();
        }),
      ),
    )
      .then(([raw, profiles]) => {
        if (profiles.version !== 1 || profiles.sourceSha256 !== raw.meta.sha256)
          throw Error("Scores incompatibles avec le catalogue.");
        const cards = raw.cards.filter(isEligibleCard).map((card: Card) => {
          const style = profiles.cards[card.id];
          if (!style) throw Error("Scores manquants");
          return { ...card, style };
        });
        return {
          ...raw,
          cards,
          sets: raw.sets.map((set: Catalog["sets"][number]) => ({
            ...set,
            count: cards.filter((c: Card) => c.set === set.id).length,
          })),
        };
      })
      .then((data: Catalog) => {
        if (!alive) return;
        setCatalog(data);
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const result = parseCollection(JSON.parse(saved), data.cards);
            setCollection(result.value as Collection);
            if (result.removed)
              try {
                if (
                  !localStorage.getItem(STORAGE_KEY + ":before-rarity-filter")
                )
                  localStorage.setItem(
                    STORAGE_KEY + ":before-rarity-filter",
                    saved,
                  );
              } catch {}
            setLegacyBackup(
              localStorage.getItem(STORAGE_KEY + ":before-rarity-filter"),
            );
            if (result.removed)
              setToast(
                `${result.removed} ancien(s) choix exclu(s) de la sélection EX et plus. Une sauvegarde reste téléchargeable dans Mes favoris.`,
              );
          } else setCollection({ ...EMPTY });
        } catch {
          try {
            const recovery = localStorage.getItem(STORAGE_KEY);
            if (recovery)
              localStorage.setItem(STORAGE_KEY + ":recovery", recovery);
          } catch {}
          setCollection({ ...EMPTY });
          setStorageError(true);
          setToast(
            "Sauvegarde locale inaccessible. Exportez vos choix en JSON pour les conserver.",
          );
        }
      })
      .catch(() => {
        if (alive) setLoadError(true);
      });
    return () => {
      alive = false;
    };
  }, [reload]);
  useEffect(() => {
    if (collection)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(collection));
        setStorageError(false);
      } catch {
        setStorageError(true);
      }
  }, [collection]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 6500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const cards = catalog?.cards || [],
    sets = catalog?.sets || [];
  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const index = useMemo(() => {
    const map = new Map<string, Card[]>();
    for (const c of cards)
      for (const key of [
        slotKey("set", c.set, c.rarity),
        slotKey("type", c.type, c.rarity),
      ]) {
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(c);
      }
    return map;
  }, [cards]);
  const rarities = useMemo(
    () => [
      ...standardRarities.filter((r) => cards.some((c) => c.rarity === r)),
      ...new Set(
        cards.map((c) => c.rarity).filter((r) => !standardRarities.includes(r)),
      ),
    ],
    [cards],
  );
  const selected = useMemo(
    () =>
      [...new Set(Object.values(collection?.selections || {}))]
        .map((id) => byId.get(id)!)
        .filter(Boolean),
    [collection, byId],
  );
  const filteredFavorites = selected.filter(
    (c) =>
      (!setFilter || c.set === setFilter) &&
      (!typeFilter || c.type === typeFilter) &&
      (!rarityFilter || c.rarity === rarityFilter) &&
      `${c.name} ${c.englishName} ${c.id}`
        .toLocaleLowerCase("fr")
        .includes(query.toLocaleLowerCase("fr")),
  );
  const visibleSets = sets
    .filter(
      (s) =>
        (!setFilter || s.id === setFilter) &&
        `${s.name} ${s.englishName} ${s.id}`
          .toLocaleLowerCase("fr")
          .includes(query.toLocaleLowerCase("fr")),
    )
    .sort(
      (a, b) =>
        (a.date || "9999").localeCompare(b.date || "9999") ||
        a.id.localeCompare(b.id),
    );
  const series = [...new Set(visibleSets.map((s) => s.series))];
  const visibleRarities = rarityFilter ? [rarityFilter] : rarities;
  const rows =
    mode === "set"
      ? visibleSets.map((s) => ({
          id: s.id,
          name: s.name,
          sub: `${s.id.toUpperCase()} · ${s.count} cartes`,
          series: s.series,
        }))
      : Object.entries(typeNames)
          .filter(
            ([id, name]) =>
              (!typeFilter || id === typeFilter) &&
              name
                .toLocaleLowerCase("fr")
                .includes(query.toLocaleLowerCase("fr")),
          )
          .map(([id, name]) => ({
            id,
            name,
            sub:
              id === "Trainer" ? "Objets, Outils, Supporters…" : "Type Pokémon",
            series: "",
          }));
  const clearFilters = () => {
    setQuery("");
    setSetFilter("");
    setRarityFilter("");
    setTypeFilter("");
  };
  const choose = (key: string, id: string | null) => {
    setCollection((old) => {
      if (!old) return old;
      const selections = { ...old.selections };
      if (id) selections[key] = id;
      else delete selections[key];
      return cleanCollection({ ...old, selections }, cards) as Collection;
    });
    setToast(
      id ? "Une nouvelle place dans votre collection." : "Sélection retirée.",
    );
  };
  const editCard = (id: string) => {
    const slots = Object.entries(collection?.selections || {}).filter(
      ([, v]) => v === id,
    );
    if (slots.length === 1) setActiveSlot(slots[0][0]);
    else setEditId(id);
  };
  const removeCard = (id: string) =>
    setCollection((old) =>
      old
        ? (cleanCollection(
            {
              ...old,
              selections: Object.fromEntries(
                Object.entries(old.selections).filter(([, v]) => v !== id),
              ),
            },
            cards,
          ) as Collection)
        : old,
    );
  const toggleTop = (id: string) => {
    if (!collection) return;
    if (collection.top.includes(id))
      setCollection({
        ...collection,
        top: collection.top.filter((v) => v !== id),
      });
    else if (collection.top.length < 10)
      setCollection({ ...collection, top: [...collection.top, id] });
    else
      setToast(
        "Votre Top 10 est complet. Retirez une carte pour lui faire une place.",
      );
  };
  const importFile = async (file: File) => {
    try {
      if (file.size > 2 * 1024 * 1024) throw Error("Ce fichier dépasse 2 Mo.");
      const { value, removed } = parseCollection(
        JSON.parse(await file.text()),
        cards,
      );
      setCollection(
        (old) =>
          cleanCollection(
            {
              ...value,
              selections: { ...old?.selections, ...value.selections },
              top: [...new Set([...value.top, ...(old?.top || [])])].slice(
                0,
                10,
              ),
              absolute: value.absolute || old?.absolute,
              winners: { ...old?.winners, ...value.winners },
            },
            cards,
          ) as Collection,
      );
      setToast(
        `Sauvegarde importée et fusionnée${removed ? ` · ${removed} entrée(s) invalide(s) ignorée(s)` : ""}.`,
      );
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Fichier JSON illisible.");
    }
  };
  const exportJSON = () => {
    download(
      new Blob(
        [
          JSON.stringify(
            {
              ...collection,
              signature: {
                ...computeProfile(selected),
                catalogSha256: catalog?.meta.sha256,
                artwork: Object.fromEntries(
                  selected.map((c) => [
                    c.id,
                    {
                      scores: c.style?.scores,
                      imageSha256: c.style?.imageSha256,
                    },
                  ]),
                ),
              },
            },
            null,
            2,
          ),
        ],
        {
          type: "application/json",
        },
      ),
      "pocket-favorites.json",
    );
    setToast("Sauvegarde JSON téléchargée.");
  };
  const exportImage = async (format: "landscape" | "story") => {
    if (!collection) return;
    setExporting(true);
    try {
      const result = await exportPNG(
        collection.selections,
        cards,
        sets,
        mode,
        format,
      );
      setToast(
        `${result.pages} image(s) exportée(s)${result.missing ? ` · ${result.missing} illustration(s) indisponible(s), signalée(s) dans l’image` : ""}.`,
      );
      setModal(null);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Export impossible.");
    } finally {
      setExporting(false);
    }
  };
  const exportResult = async () => {
    if (!collection) return;
    setExporting(true);
    try {
      const r = await exportResultPNG(selected, collection);
      setToast(
        `${r.pages} PNG HD téléchargé(s)${r.missing ? ` · ${r.missing} illustration(s) indisponible(s), signalée(s) dans l’image` : ""}. Prêt à partager !`,
      );
      setModal(null);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Export impossible.");
    } finally {
      setExporting(false);
    }
  };
  const start = () => {
    setView("matrix");
    setTimeout(
      () =>
        matrixRef.current?.scrollIntoView({
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
        }),
      50,
    );
  };
  const groups = useMemo(() => {
    const map = new Map<string, Card[]>();
    for (const c of selected) {
      const value =
        summaryGroup === "set"
          ? c.set
          : summaryGroup === "type"
            ? c.type
            : c.rarity;
      const key = `${summaryGroup}|${value}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return [...map.entries()];
  }, [selected, summaryGroup]);
  if (!catalog || !collection)
    return (
      <div className="loading-screen">
        <span className="brand-mark">✳</span>
        <h1>
          Pocket Favorites<span>.</span>
        </h1>
        {loadError ? (
          <>
            <p>Le catalogue n’a pas pu être chargé.</p>
            <button
              className="primary-button"
              onClick={() => setReload((v) => v + 1)}
            >
              Réessayer
            </button>
          </>
        ) : (
          <p>
            <LoaderCircle className="spin" size={18} /> Ouverture de votre petit
            musée…
          </p>
        )}
      </div>
    );
  const heroCards = ["a1-280", "a1-283", "a1-282"]
    .map((id) => byId.get(id))
    .filter(Boolean) as Card[];
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <button
            className="brand"
            onClick={() => {
              setView("matrix");
              window.scrollTo({
                top: 0,
                behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
                  ? "instant"
                  : "smooth",
              });
            }}
            aria-label="Pocket Favorites, accueil"
          >
            <span className="brand-mark">✳</span>
            <span>
              pocket<span className="brand-light">favorites</span>
              <span className="brand-dot">.</span>
            </span>
          </button>
          <nav aria-label="Navigation principale">
            <button
              className={view === "matrix" ? "nav-active" : ""}
              onClick={() => setView("matrix")}
            >
              Ma matrice
            </button>
            <button
              className={view === "favorites" ? "nav-active" : ""}
              onClick={() => {
                setView("favorites");
                clearFilters();
              }}
            >
              Mes favoris <span className="count-badge">{selected.length}</span>
            </button>
          </nav>
          <div className="header-right">
            <span
              className={`local-status ${storageError ? "status-error" : ""}`}
            >
              <span />
              {storageError
                ? "Stockage indisponible"
                : "Sauvegardé sur cet appareil"}
            </span>
            <button
              className="icon-button"
              aria-label="À propos et mode d’emploi"
              onClick={() => setModal("help")}
            >
              <Info size={19} />
            </button>
          </div>
        </div>
      </header>
      <main>
        {view === "matrix" && (
          <section className="hero">
            <div className="hero-copy">
              <div className="overline">
                <span className="tiny-star">✧</span> VOTRE COLLECTION. VOTRE
                REGARD.
              </div>
              <h1>
                Vos cartes.
                <br />
                Vos{" "}
                <span className="mint-underline">
                  coups de cœur
                  <svg
                    viewBox="0 0 380 13"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path d="M2 9Q175 -2 378 7" />
                  </svg>
                </span>
                <span className="heading-dot" aria-hidden="true">
                  .
                </span>
              </h1>
              <p>
                Il y a les cartes que l’on collectionne.
                <br />
                Et celles que l’on aime, tout simplement.
                <br />
                <strong>Composez votre sélection Pokémon TCG Pocket.</strong>
              </p>
              <div className="hero-actions">
                <button className="primary-button" onClick={start}>
                  Composer ma matrice <ArrowRight size={18} />
                </button>
                <span className="hero-note">
                  EX, illustrations rares et promos.
                </span>
              </div>
            </div>
            <div
              className="hero-art"
              aria-label="Quelques illustrations à découvrir"
            >
              <span className="art-orbit orbit-one" />
              <span className="art-orbit orbit-two" />
              <span className="art-spark spark-one">✦</span>
              <span className="art-spark spark-two">✧</span>
              <span className="art-small-dot" />
              {heroCards.map((c, i) => (
                <button
                  key={c.id}
                  className={`hero-card hero-card-${i}`}
                  onClick={() => setZoom(c)}
                  aria-label={`Découvrir ${c.name} ${c.id}`}
                >
                  <CardImage card={c} eager />
                </button>
              ))}
              <span className="hero-sticker">
                <Heart size={14} fill="currentColor" /> Le plus dur, c’est de
                choisir.
              </span>
              <span className="art-caption">
                ILLUSTRATIONS À DÉCOUVRIR · AUCUN FAVORI PRÉSÉLECTIONNÉ
              </span>
            </div>
          </section>
        )}
        {view === "matrix" ? (
          <>
            <div className="collection-bar">
              <div>
                <span className="mini-icon">
                  <Layers size={18} />
                </span>
                <strong>{cards.length.toLocaleString("fr-FR")}</strong>
                <span>cartes à choisir</span>
              </div>
              <i />
              <div>
                <strong>{sets.length}</strong>
                <span>extensions, promos incluses</span>
              </div>
              <i />
              <div className="progress-stat">
                <Heart size={17} />
                <strong>{Object.keys(collection.selections).length}</strong>
                <span>
                  case
                  {Object.keys(collection.selections).length !== 1
                    ? "s"
                    : ""}{" "}
                  remplie
                  {Object.keys(collection.selections).length !== 1 ? "s" : ""}
                </span>
              </div>
              <span className="bar-end">
                <ShieldCheck size={15} /> Vos choix restent chez vous.
              </span>
            </div>
            <section className="matrix-section" ref={matrixRef}>
              <div className="section-heading">
                <div>
                  <div className="eyebrow">
                    UN PETIT MUSÉE QUI VOUS RESSEMBLE
                  </div>
                  <h2>
                    La matrice de vos envies<span>.</span>
                  </h2>
                  <p>
                    4 losanges (EX), étoiles, couronnes et promotions. À vous de
                    choisir.
                  </p>
                </div>
                <div className="section-actions">
                  <button
                    className="secondary-button"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload size={16} />
                    <span>Importer</span>
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => setModal("export")}
                  >
                    <Download size={16} /> Exporter <ChevronDown size={14} />
                  </button>
                </div>
              </div>
              <div className="view-controls">
                <div className="segmented">
                  <button
                    className={
                      mode === "set" && layout === "grid" ? "active" : ""
                    }
                    onClick={() => {
                      setMode("set");
                      setLayout("grid");
                      clearFilters();
                    }}
                  >
                    <Grid2X2 size={15} /> Extension × Rareté
                  </button>
                  <button
                    className={
                      mode === "type" && layout === "grid" ? "active" : ""
                    }
                    onClick={() => {
                      setMode("type");
                      setLayout("grid");
                      clearFilters();
                    }}
                  >
                    <Sparkles size={15} /> Type × Rareté
                  </button>
                  <button
                    className={layout === "list" ? "active" : ""}
                    onClick={() => {
                      setLayout("list");
                      clearFilters();
                    }}
                  >
                    <List size={16} /> Liste
                  </button>
                </div>
                <span className="hint">
                  <Plus size={14} /> Cliquez sur une case pour choisir
                </span>
              </div>
              <div className="filter-bar">
                <div className="search-field">
                  <Search size={17} />
                  <input
                    aria-label={
                      layout === "list"
                        ? "Rechercher un favori"
                        : "Rechercher une catégorie"
                    }
                    placeholder={
                      layout === "list"
                        ? "Rechercher une carte…"
                        : mode === "set"
                          ? "Rechercher une extension…"
                          : "Rechercher un type…"
                    }
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query && (
                    <button
                      aria-label="Effacer la recherche"
                      onClick={() => setQuery("")}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className="filter-selects">
                  <SlidersHorizontal size={15} />
                  {(mode === "set" || layout === "list") && (
                    <select
                      aria-label="Filtrer par extension"
                      value={setFilter}
                      onChange={(e) => setSetFilter(e.target.value)}
                    >
                      <option value="">Toutes les extensions</option>
                      {sets.map((s) => (
                        <option value={s.id} key={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {(mode === "type" || layout === "list") && (
                    <select
                      aria-label="Filtrer par type"
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                    >
                      <option value="">Tous les types</option>
                      {Object.entries(typeNames).map(([id, name]) => (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      ))}
                    </select>
                  )}
                  <select
                    aria-label="Filtrer par rareté"
                    value={rarityFilter}
                    onChange={(e) => setRarityFilter(e.target.value)}
                  >
                    <option value="">Toutes les raretés</option>
                    {rarities.map((r) => (
                      <option key={r} value={r}>
                        {rarityName(r)}
                      </option>
                    ))}
                  </select>
                  {(query || setFilter || rarityFilter || typeFilter) && (
                    <button className="text-button" onClick={clearFilters}>
                      Réinitialiser
                    </button>
                  )}
                </div>
              </div>
              {layout === "list" ? (
                <FavoriteGrid
                  cards={filteredFavorites}
                  collection={collection}
                  onZoom={setZoom}
                  onRemove={removeCard}
                  onEdit={editCard}
                  onTop={toggleTop}
                  onAbsolute={(id) =>
                    setCollection({ ...collection, absolute: id })
                  }
                  onStart={start}
                />
              ) : (
                <div
                  className="matrix"
                  style={
                    {
                      "--columns": visibleRarities.length,
                    } as React.CSSProperties
                  }
                >
                  <div className="matrix-column-head">
                    <div>VOTRE {mode === "set" ? "EXTENSION" : "TYPE"}</div>
                    {visibleRarities.map((r) => (
                      <div
                        className={`rarity-heading ${r === "Crown Rare" ? "gold" : ""}`}
                        key={r}
                      >
                        <b>{rarityLabel(r)}</b>
                        <span>{rarityName(r)}</span>
                      </div>
                    ))}
                  </div>
                  {rows.length === 0 ? (
                    <div className="empty-results">
                      Aucune catégorie ne correspond à ces filtres.
                      <button className="text-button" onClick={clearFilters}>
                        Effacer les filtres
                      </button>
                    </div>
                  ) : (
                    (mode === "set" ? series : [""]).map((seriesId) => (
                      <div className="series-group" key={seriesId || "types"}>
                        {mode === "set" && (
                          <button
                            className="series-heading"
                            aria-expanded={!folded.includes(seriesId)}
                            onClick={() =>
                              setFolded((old) =>
                                old.includes(seriesId)
                                  ? old.filter((s) => s !== seriesId)
                                  : [...old, seriesId],
                              )
                            }
                          >
                            {folded.includes(seriesId) ? (
                              <ChevronRight size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            )}
                            <span>SÉRIE {seriesId}</span>
                            <span className="series-line" />
                            <small>
                              {rows.filter((s) => s.series === seriesId).length}{" "}
                              extensions
                            </small>
                          </button>
                        )}
                        {!folded.includes(seriesId) &&
                          rows
                            .filter(
                              (s) => mode === "type" || s.series === seriesId,
                            )
                            .map((row) => (
                              <div className="matrix-row" key={row.id}>
                                <div className="matrix-row-label">
                                  {mode === "type" ? (
                                    <span
                                      className="type-orb"
                                      style={{ background: typeColors[row.id] }}
                                    />
                                  ) : (
                                    <span className="set-emblem">
                                      {row.id.toUpperCase()}
                                    </span>
                                  )}
                                  <div>
                                    <h3>{row.name}</h3>
                                    <span>{row.sub}</span>
                                  </div>
                                  <span className="row-progress">
                                    {
                                      visibleRarities.filter(
                                        (r) =>
                                          collection.selections[
                                            slotKey(mode, row.id, r)
                                          ],
                                      ).length
                                    }
                                    /
                                    {
                                      visibleRarities.filter((r) =>
                                        index.has(slotKey(mode, row.id, r)),
                                      ).length
                                    }
                                  </span>
                                </div>
                                <div className="matrix-cells">
                                  {visibleRarities.map((r) => {
                                    const key = slotKey(mode, row.id, r),
                                      c = byId.get(collection.selections[key]),
                                      count = index.get(key)?.length || 0;
                                    return (
                                      <div
                                        className={`cell ${c ? "filled" : ""} ${!count ? "unavailable" : ""}`}
                                        key={r}
                                      >
                                        <span className="mobile-rarity">
                                          {rarityLabel(r)}{" "}
                                          <small>{rarityName(r)}</small>
                                        </span>
                                        {count ? (
                                          <button
                                            className="slot-button"
                                            aria-label={`${c ? "Modifier" : "Choisir"} ${row.name}, ${rarityName(r)}${c ? `, ${c.name}` : ""}`}
                                            onClick={() => setActiveSlot(key)}
                                          >
                                            {c ? (
                                              <>
                                                <CardImage card={c} />
                                                <span className="slot-edit">
                                                  Modifier{" "}
                                                  <ArrowRight size={12} />
                                                </span>
                                              </>
                                            ) : (
                                              <>
                                                <span className="add-circle">
                                                  <Plus size={18} />
                                                </span>
                                                <span className="slot-prompt">
                                                  Choisir
                                                </span>
                                                <small>{count} cartes</small>
                                              </>
                                            )}
                                          </button>
                                        ) : (
                                          <span
                                            className="no-cards"
                                            aria-label={`Aucune carte : ${row.name}, ${rarityName(r)}`}
                                          >
                                            <span>—</span>
                                            <small>Aucune carte</small>
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                      </div>
                    ))
                  )}
                </div>
              )}
              <div className="matrix-footnote">
                <span>
                  <span className="mint-dot" /> Chaque choix est sauvegardé
                  automatiquement.
                </span>
                <button
                  className="text-button"
                  onClick={() => setModal("help")}
                >
                  Comment ça marche ? <ArrowRight size={14} />
                </button>
              </div>
            </section>
          </>
        ) : (
          <section className="favorites-section">
            <div className="section-heading">
              <div>
                <div className="eyebrow">C’EST TOUT VOUS</div>
                <h1>
                  Mes coups de cœur<span>.</span>
                </h1>
                <p>
                  {selected.length} illustration{selected.length > 1 ? "s" : ""}
                  , autant de belles raisons de collectionner.
                </p>
              </div>
              <button
                className="secondary-button"
                onClick={() => setModal("export")}
              >
                <Download size={16} /> Exporter mes choix
              </button>
            </div>
            {legacyBackup && (
              <div className="legacy-notice">
                <p>
                  Les cartes à 1, 2 et 3 losanges sont retirées de cette
                  version. Vos anciens choix restent sauvegardés.
                </p>
                <button
                  className="text-button"
                  onClick={() =>
                    download(
                      new Blob([legacyBackup], { type: "application/json" }),
                      "pocket-favorites-anciens-choix.json",
                    )
                  }
                >
                  Télécharger mes anciens choix JSON <Download size={14} />
                </button>
              </div>
            )}
            <ProfilePanel
              cards={selected}
              onExport={() => void exportResult()}
              busy={exporting}
            />
            {selected.length > 0 && (
              <>
                <div className="favorites-featured">
                  <div className="absolute-card">
                    <div>
                      <span className="eyebrow">
                        <Crown size={15} /> LE COUP DE CŒUR ABSOLU
                      </span>
                      <h2>
                        {collection.absolute
                          ? byId.get(collection.absolute)?.name
                          : "La carte qui passe avant toutes les autres."}
                      </h2>
                      <p>
                        {collection.absolute
                          ? "Votre choix. Tout simplement."
                          : "Touchez la couronne d’une carte ci-dessous pour lui offrir cette place."}
                      </p>
                      {collection.absolute && (
                        <button
                          className="text-button"
                          onClick={() =>
                            setCollection({ ...collection, absolute: null })
                          }
                        >
                          Retirer ce titre <X size={14} />
                        </button>
                      )}
                    </div>
                    {collection.absolute ? (
                      <button
                        className="absolute-image"
                        onClick={() => setZoom(byId.get(collection.absolute!)!)}
                      >
                        <CardImage card={byId.get(collection.absolute)!} />
                      </button>
                    ) : (
                      <Crown
                        className="empty-crown"
                        size={82}
                        strokeWidth={1}
                      />
                    )}
                  </div>
                  <div className="top-ten">
                    <div>
                      <span className="eyebrow">VOTRE PREMIER RANG</span>
                      <h2>
                        Le Top 10<span> {collection.top.length}/10</span>
                      </h2>
                      <p>
                        Ajoutez vos favoris avec l’étoile, puis ajustez leur
                        ordre.
                      </p>
                    </div>
                    <div className="top-strip">
                      {collection.top.length ? (
                        collection.top.map((id, i) => (
                          <div className="top-item" key={id}>
                            <button
                              className="top-image"
                              onClick={() => setZoom(byId.get(id)!)}
                            >
                              <CardImage card={byId.get(id)!} />
                              <b>{i + 1}</b>
                            </button>
                            <div>
                              <button
                                disabled={i === 0}
                                aria-label={`Monter ${byId.get(id)?.name}`}
                                onClick={() => {
                                  const top = [...collection.top];
                                  [top[i - 1], top[i]] = [top[i], top[i - 1]];
                                  setCollection({ ...collection, top });
                                }}
                              >
                                <ArrowLeft size={13} />
                              </button>
                              <button
                                aria-label={`Retirer ${byId.get(id)?.name} du Top 10`}
                                onClick={() => toggleTop(id)}
                              >
                                <X size={12} />
                              </button>
                              <button
                                disabled={i === collection.top.length - 1}
                                aria-label={`Descendre ${byId.get(id)?.name}`}
                                onClick={() => {
                                  const top = [...collection.top];
                                  [top[i], top[i + 1]] = [top[i + 1], top[i]];
                                  setCollection({ ...collection, top });
                                }}
                              >
                                <ArrowRight size={13} />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="empty-top">
                          <Star size={24} />
                          <span>Vos dix illustrations inoubliables, ici.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="summary-section">
                  <div className="summary-heading">
                    <h2>À chaque catégorie, son favori.</h2>
                    <select
                      aria-label="Regrouper les favoris"
                      value={summaryGroup}
                      onChange={(e) =>
                        setSummaryGroup(
                          e.target.value as "set" | "type" | "rarity",
                        )
                      }
                    >
                      <option value="set">Par extension</option>
                      <option value="type">Par type</option>
                      <option value="rarity">Par rareté</option>
                    </select>
                  </div>
                  <div className="summary-grid">
                    {groups.map(([key, options]) => {
                      const value = key.split("|")[1],
                        winner =
                          options.length === 1
                            ? options[0]
                            : options.find(
                                (c) => c.id === collection.winners[key],
                              );
                      const label =
                        summaryGroup === "set"
                          ? sets.find((s) => s.id === value)?.name
                          : summaryGroup === "type"
                            ? typeNames[value]
                            : rarityName(value);
                      return (
                        <div className="summary-item" key={key}>
                          <span>{label}</span>
                          {winner ? (
                            <button onClick={() => setZoom(winner)}>
                              <Heart size={14} />
                              {winner.name}
                              <small>{winner.id.toUpperCase()}</small>
                            </button>
                          ) : (
                            <span className="undecided">
                              {options.length} coups de cœur à départager
                            </span>
                          )}
                          {options.length > 1 && (
                            <select
                              aria-label={`Choisir le favori : ${label}`}
                              value={winner?.id || ""}
                              onChange={(e) =>
                                setCollection({
                                  ...collection,
                                  winners: {
                                    ...collection.winners,
                                    [key]: e.target.value,
                                  },
                                })
                              }
                            >
                              <option value="">À vous de décider…</option>
                              {options.map((c) => (
                                <option value={c.id} key={c.id}>
                                  {c.name} · {c.id.toUpperCase()}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
            <div className="favorites-all-heading">
              <h2>
                Toutes vos belles trouvailles <span>{selected.length}</span>
              </h2>
              <div className="search-field">
                <Search size={17} />
                <input
                  aria-label="Rechercher parmi les favoris"
                  placeholder="Nom ou identifiant…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="favorite-filters">
              <select
                aria-label="Extension des favoris"
                value={setFilter}
                onChange={(e) => setSetFilter(e.target.value)}
              >
                <option value="">Toutes les extensions</option>
                {sets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Type des favoris"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">Tous les types</option>
                {Object.entries(typeNames).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Rareté des favoris"
                value={rarityFilter}
                onChange={(e) => setRarityFilter(e.target.value)}
              >
                <option value="">Toutes les raretés</option>
                {rarities.map((r) => (
                  <option key={r} value={r}>
                    {rarityName(r)}
                  </option>
                ))}
              </select>
              {(query || setFilter || typeFilter || rarityFilter) && (
                <button className="text-button" onClick={clearFilters}>
                  Effacer les filtres
                </button>
              )}
            </div>
            <FavoriteGrid
              cards={filteredFavorites}
              collection={collection}
              onZoom={setZoom}
              onRemove={removeCard}
              onEdit={editCard}
              onTop={toggleTop}
              onAbsolute={(id) =>
                setCollection({ ...collection, absolute: id })
              }
              onStart={start}
            />
          </section>
        )}
        <section className="bottom-note">
          <span>✳</span>
          <div>
            <h3>Une collection qui n’appartient qu’à vous.</h3>
            <p>
              Pas de classement universel. Pas de mauvaise réponse. Juste les
              cartes qui vous font sourire.
            </p>
          </div>
          <Heart size={25} />
        </section>
      </main>
      <footer>
        <span className="footer-brand">
          pocketfavorites<span>.</span>
        </span>
        <p>Fait pour le plaisir de collectionner.</p>
        <button className="text-button" onClick={() => setModal("help")}>
          Sources & mentions
        </button>
        <a
          className="source-link"
          href={`${import.meta.env.BASE_URL}source/pocket-favorites-source.tgz`}
          download
        >
          Code source · AGPL
        </a>
        <span className="footer-legal">
          Projet de fans non officiel · Illustrations © Pokémon et leurs ayants
          droit.
        </span>
      </footer>
      <input
        ref={fileRef}
        className="visually-hidden"
        tabIndex={-1}
        type="file"
        accept="application/json,.json"
        aria-label="Importer une sauvegarde JSON"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importFile(file);
          e.currentTarget.value = "";
        }}
      />
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          <span>{toast}</span>
          <button
            aria-label="Fermer la notification"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {editId && (
        <Modal title="Quelle case modifier ?" onClose={() => setEditId(null)}>
          <p className="modal-intro">
            Cette carte occupe plusieurs places. Choisissez celle à modifier.
          </p>
          <div className="edit-slot-options">
            {Object.entries(collection.selections)
              .filter(([, id]) => id === editId)
              .map(([key]) => {
                const [m, row, r] = key.split("|");
                return (
                  <button
                    className="secondary-button"
                    key={key}
                    onClick={() => {
                      setEditId(null);
                      setActiveSlot(key);
                    }}
                  >
                    {m === "set"
                      ? sets.find((s) => s.id === row)?.name
                      : typeNames[row]}{" "}
                    · {rarityName(r)}
                    <ArrowRight size={15} />
                  </button>
                );
              })}
          </div>
        </Modal>
      )}
      {activeSlot && (
        <Gallery
          slot={activeSlot}
          cards={index.get(activeSlot) || []}
          current={collection.selections[activeSlot]}
          sets={sets}
          onClose={() => setActiveSlot(null)}
          onChoose={(id) => {
            choose(activeSlot, id);
            setActiveSlot(null);
          }}
          onZoom={setZoom}
        />
      )}
      {zoom && (
        <Modal title={zoom.name} onClose={() => setZoom(null)}>
          <div className="zoom-content">
            <div className="zoom-image">
              <CardImage card={zoom} eager />
            </div>
            <div className="card-metadata">
              <strong>
                {zoom.id.toUpperCase()} <span>{rarityLabel(zoom.rarity)}</span>
              </strong>
              <p>{sets.find((s) => s.id === zoom.set)?.name}</p>
              <p>
                {typeNames[zoom.type] || zoom.type} ·{" "}
                {zoom.category === "Trainer" ? "Dresseur" : "Pokémon"}
              </p>
              <p>Illustration : {zoom.artist || "Non renseigné"}</p>
              <a
                href={`https://pocket.limitlesstcg.com/cards/${zoom.set.toUpperCase()}/${Number(zoom.number)}`}
                target="_blank"
                rel="noreferrer"
              >
                Vérifier cette impression sur Limitless ↗
              </a>
              {zoom.style && (
                <details className="card-style-details">
                  <summary>La signature de cette illustration</summary>
                  <ScoreBars scores={zoom.style.scores} />
                  <p>
                    60 % couleurs et textures de cette illustration, 40 %
                    attributs du Pokémon. Ces notes contribuent à la moyenne de
                    votre profil.
                  </p>
                </details>
              )}
              {zoom.variants.length > 0 && (
                <details>
                  <summary>
                    {zoom.variants.length} autre(s) impression(s) documentée(s)
                  </summary>
                  <div className="variant-list">
                    {zoom.variants.map((v) => {
                      const c = byId.get(
                        `${v.set_code}-${String(v.id).padStart(3, "0")}`,
                      );
                      return c ? (
                        <button key={c.id} onClick={() => setZoom(c)}>
                          {c.id.toUpperCase()} · {rarityLabel(c.rarity)}
                        </button>
                      ) : (
                        <span key={`${v.set_code}-${v.id}`}>
                          {v.set_code.toUpperCase()}-{v.id} (hors catalogue)
                        </span>
                      );
                    })}
                  </div>
                </details>
              )}
            </div>
          </div>
        </Modal>
      )}
      {modal === "export" && (
        <Modal
          title="Vos favoris, à emporter."
          onClose={() => {
            if (!exporting) setModal(null);
          }}
        >
          <p className="modal-intro">
            Partagez votre profil et toutes vos illustrations favorites en PNG
            haute qualité, ou emportez une matrice et une sauvegarde. L’export
            de matrice reprend les choix explicites du mode{" "}
            {mode === "set" ? "Extension × Rareté" : "Type × Rareté"}, avec leur
            catégorie et leur identifiant.
          </p>
          <button
            className="result-export-option"
            disabled={exporting || !selected.length}
            onClick={() => void exportResult()}
          >
            <Sparkles size={24} />
            <span>
              <strong>Mon résultat · PNG HD</strong>
              <small>
                2400 px · mon profil, ses 4 dimensions et tous mes favoris des
                deux matrices
              </small>
            </span>
            <Download size={19} />
          </button>
          <label className="export-mode-label">
            Matrice à exporter{" "}
            <select
              aria-label="Matrice à exporter"
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
              disabled={exporting}
            >
              <option value="set">Extension × Rareté</option>
              <option value="type">Type × Rareté</option>
            </select>
          </label>
          <div className="export-options">
            <button
              disabled={exporting}
              onClick={() => void exportImage("landscape")}
            >
              <span className="export-format landscape-format">
                <Grid2X2 size={24} />
              </span>
              <strong>Paysage</strong>
              <span>2400 px · planche de collection</span>
              <Download size={17} />
            </button>
            <button
              disabled={exporting}
              onClick={() => void exportImage("story")}
            >
              <span className="export-format story-format">
                <Heart size={22} />
              </span>
              <strong>Story</strong>
              <span>1080 px · format vertical</span>
              <Download size={17} />
            </button>
          </div>
          <p className="small-muted">
            Les grandes collections sont réparties sur plusieurs images pour
            rester lisibles. Votre navigateur peut demander d’autoriser les
            téléchargements multiples.
          </p>
          {exporting && (
            <p className="export-progress" role="status">
              <LoaderCircle size={17} className="spin" /> Préparation des
              illustrations originales…
            </p>
          )}
          <div className="json-export">
            <div>
              <strong>La sauvegarde complète</strong>
              <p>Matrice, Top 10, favori absolu et arbitrages. Sans images.</p>
            </div>
            <button className="secondary-button" onClick={exportJSON}>
              <Download size={16} /> JSON
            </button>
          </div>
          <button
            className="text-button"
            onClick={() => {
              setModal(null);
              fileRef.current?.click();
            }}
          >
            <Upload size={15} /> Importer et fusionner une sauvegarde JSON
          </button>
        </Modal>
      )}
      {modal === "help" && (
        <Modal title="Un favori à la fois." onClose={() => setModal(null)}>
          <div className="help-content">
            <p>
              Choisissez une case, explorez ses illustrations et gardez celle
              qui vous plaît. Les modes Extension et Type ont leurs propres
              cases : vos choix sont conservés en passant de l’un à l’autre.
            </p>
            <ol>
              <li>
                <strong>Explorez.</strong> Filtrez la galerie ou comparez les
                cartes deux à deux avec le mode assisté.
              </li>
              <li>
                <strong>Composez.</strong> Retrouvez vos choix dans Mes favoris.
                Désignez explicitement votre Top 10, votre favori absolu et les
                gagnants des catégories à départager.
              </li>
              <li>
                <strong>Emportez.</strong> Exportez les planches PNG ou
                sauvegardez le JSON. Tout reste local à ce navigateur ; aucun
                compte n’est nécessaire.
              </li>
            </ol>
            <h3>Des données traçables</h3>
            <p>
              {cards.length.toLocaleString("fr-FR")} impressions · {sets.length}{" "}
              extensions · import du{" "}
              {new Date(catalog.meta.updated).toLocaleDateString("fr-FR")}.
            </p>
            <p>
              Catalogue complet{" "}
              <a
                href="https://github.com/PocketDecks/pokemon-tcg-pocket-cards"
                target="_blank"
                rel="noreferrer"
              >
                PocketDecks v5 full
              </a>{" "}
              (AGPL-3.0-or-later), issu de{" "}
              <a
                href="https://pocket.limitlesstcg.com/cards"
                target="_blank"
                rel="noreferrer"
              >
                Limitless TCG
              </a>
              . Référence complémentaire :{" "}
              <a
                href="https://github.com/flibustier/pokemon-tcg-pocket-database"
                target="_blank"
                rel="noreferrer"
              >
                flibustier
              </a>{" "}
              (MIT). Noms français disponibles via{" "}
              <a
                href="https://github.com/PokeAPI/pokeapi"
                target="_blank"
                rel="noreferrer"
              >
                PokéAPI
              </a>{" "}
              (BSD-3-Clause), avec repli anglais.
            </p>
            <h3>Illustrations & droits</h3>
            <p>
              Chaque image est liée à son extension et son numéro exacts. Les
              illustrations originales sont préparées depuis le dépôt source et
              servies avec le site. Les images indisponibles sont signalées,
              jamais remplacées par une autre carte.
            </p>
            <p>
              Application de fans non officielle, sans affiliation. Pokémon et
              ses illustrations appartiennent à Nintendo, Creatures Inc., GAME
              FREAK Inc. et DeNA. La licence des données ne confère aucun droit
              sur les illustrations. Consultez les notices du projet avant toute
              redistribution ou exploitation commerciale.
            </p>
            <p className="small-muted">
              La sauvegarde locale peut être effacée par votre navigateur. Un
              export JSON reste le moyen de la conserver ou de changer
              d’appareil.
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}

function FavoriteGrid({
  cards,
  collection,
  onZoom,
  onRemove,
  onEdit,
  onTop,
  onAbsolute,
  onStart,
}: {
  cards: Card[];
  collection: Collection;
  onZoom: (c: Card) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string) => void;
  onTop: (id: string) => void;
  onAbsolute: (id: string) => void;
  onStart: () => void;
}) {
  if (!cards.length)
    return (
      <div className="empty-favorites">
        <span className="empty-heart">
          <Heart size={30} />
        </span>
        <h3>
          {Object.keys(collection.selections).length
            ? "Aucune carte avec ces filtres."
            : "Les belles rencontres commencent ici."}
        </h3>
        <p>
          {Object.keys(collection.selections).length
            ? "Essayez une autre recherche ou retirez un filtre."
            : "Votre premier coup de cœur attend sa place dans la matrice."}
        </p>
        {!Object.keys(collection.selections).length && (
          <button className="primary-button" onClick={onStart}>
            Choisir ma première carte <ArrowRight size={16} />
          </button>
        )}
      </div>
    );
  return (
    <div className="favorite-grid">
      {cards.map((c) => (
        <article className="favorite-card" key={c.id}>
          <button className="favorite-image" onClick={() => onZoom(c)}>
            <CardImage card={c} />
            <span className="zoom-label">
              <Maximize2 size={15} /> Voir l’illustration
            </span>
          </button>
          <div className="favorite-caption">
            <h3>{c.name}</h3>
            <span>
              {c.id.toUpperCase()} <b>{rarityLabel(c.rarity)}</b>
            </span>
          </div>
          <div className="favorite-actions">
            <button
              className={collection.top.includes(c.id) ? "is-top" : ""}
              aria-label={`${collection.top.includes(c.id) ? "Retirer" : "Ajouter"} ${c.name} ${c.id} ${collection.top.includes(c.id) ? "du" : "au"} Top 10`}
              aria-pressed={collection.top.includes(c.id)}
              onClick={() => onTop(c.id)}
            >
              <Star
                size={17}
                fill={collection.top.includes(c.id) ? "currentColor" : "none"}
              />
              <span>Top 10</span>
            </button>
            <button
              className={collection.absolute === c.id ? "is-absolute" : ""}
              aria-label={`Désigner ${c.name} ${c.id} favori absolu`}
              aria-pressed={collection.absolute === c.id}
              onClick={() => onAbsolute(c.id)}
            >
              <Crown size={18} />
            </button>
            <button
              aria-label={`Modifier la sélection ${c.name} ${c.id}`}
              onClick={() => onEdit(c.id)}
            >
              <Pencil size={15} />
            </button>
            <button
              aria-label={`Supprimer ${c.name} ${c.id} de tous les favoris`}
              onClick={() => onRemove(c.id)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function Gallery({
  slot,
  cards,
  current,
  sets,
  onClose,
  onChoose,
  onZoom,
}: {
  slot: string;
  cards: Card[];
  current?: string;
  sets: Catalog["sets"];
  onClose: () => void;
  onChoose: (id: string | null) => void;
  onZoom: (c: Card) => void;
}) {
  const [mode, row, rarity] = slot.split("|");
  const title =
    mode === "set"
      ? sets.find((s) => s.id === row)?.name || row
      : typeNames[row] || row;
  const [search, setSearch] = useState(""),
    [type, setType] = useState(""),
    [expansion, setExpansion] = useState(""),
    [sort, setSort] = useState("number"),
    [limit, setLimit] = useState(60),
    [assisted, setAssisted] = useState(false),
    [round, setRound] = useState(1),
    [candidate, setCandidate] = useState<Card | null>(null);
  const deferred = useDeferredValue(search);
  const filtered = useMemo(
    () =>
      cards
        .filter(
          (c) =>
            (!type || c.type === type) &&
            (!expansion || c.set === expansion) &&
            `${c.name} ${c.englishName} ${c.id} ${c.artist}`
              .toLocaleLowerCase("fr")
              .includes(deferred.toLocaleLowerCase("fr")),
        )
        .sort((a, b) =>
          sort === "name"
            ? a.name.localeCompare(b.name, "fr")
            : a.id.localeCompare(b.id, undefined, { numeric: true }),
        ),
    [cards, type, expansion, deferred, sort],
  );
  useEffect(() => {
    setLimit(60);
    setAssisted(false);
    setRound(1);
    setCandidate(null);
  }, [search, type, expansion, sort]);
  const assistChoose = (c: Card) => {
    setCandidate(c);
    setRound((v) => v + 1);
  };
  return (
    <Modal title={title} onClose={onClose} wide>
      <div className="gallery-subtitle">
        <span className="gallery-rarity">
          {rarityLabel(rarity)} <span>{rarityName(rarity)}</span>
        </span>
        <span>
          {filtered.length} illustration{filtered.length > 1 ? "s" : ""} à
          découvrir
        </span>
        {current && (
          <button className="text-button danger" onClick={() => onChoose(null)}>
            <Trash2 size={14} /> Vider cette case
          </button>
        )}
      </div>
      <div className="gallery-toolbar">
        <div className="search-field">
          <Search size={18} />
          <input
            autoFocus
            placeholder="Un nom, un numéro, un artiste…"
            aria-label="Rechercher dans la galerie"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {mode === "set" ? (
          <select
            aria-label="Type dans la galerie"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">Tous les types</option>
            {Object.entries(typeNames).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        ) : (
          <select
            aria-label="Extension dans la galerie"
            value={expansion}
            onChange={(e) => setExpansion(e.target.value)}
          >
            <option value="">Toutes les extensions</option>
            {sets
              .filter((s) => cards.some((c) => c.set === s.id))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        )}
        <select
          aria-label="Trier la galerie"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="number">Par numéro</option>
          <option value="name">De A à Z</option>
        </select>
      </div>
      <div className="gallery-assist-bar">
        <p>
          <span className="mint-dot" /> Votre choix remplace uniquement cette
          case.
        </p>
        <button
          className={`assist-button ${assisted ? "active" : ""}`}
          disabled={filtered.length < 2}
          onClick={() => {
            setAssisted((v) => !v);
            setRound(1);
            setCandidate(filtered[0] || null);
          }}
        >
          <Sparkles size={15} />
          {assisted ? "Revenir à la galerie" : "Aidez-moi à choisir"}
        </button>
      </div>
      {assisted && candidate ? (
        <div className="assisted">
          <div className="eyebrow">UN DUEL D’ILLUSTRATIONS</div>
          <h3>
            {round >= filtered.length
              ? "Vous avez votre finaliste."
              : "Laquelle vous fait le plus sourire ?"}
          </h3>
          <p>
            {Math.min(round, filtered.length)} / {filtered.length} cartes
            comparées · rien n’est enregistré sans votre confirmation.
          </p>
          <div className="duel">
            {[
              candidate,
              ...(round < filtered.length ? [filtered[round]] : []),
            ].map((c, i) => (
              <div key={c.id} className="duel-card">
                <button className="duel-image" onClick={() => onZoom(c)}>
                  <CardImage card={c} />
                </button>
                <strong>{c.name}</strong>
                <span>{c.id.toUpperCase()}</span>
                {round < filtered.length && (
                  <button
                    className="secondary-button"
                    onClick={() => assistChoose(c)}
                  >
                    Je préfère celle-ci <Heart size={15} />
                  </button>
                )}
                {i === 0 && round < filtered.length && (
                  <span className="duel-vs">ou</span>
                )}
              </div>
            ))}
          </div>
          <button
            className="primary-button"
            onClick={() => onChoose(candidate.id)}
          >
            Choisir {candidate.name} maintenant <Check size={16} />
          </button>
        </div>
      ) : filtered.length ? (
        <>
          <div className="gallery-grid">
            {filtered.slice(0, limit).map((c) => (
              <article
                key={c.id}
                className={`gallery-card ${c.id === current ? "current" : ""}`}
              >
                <div className="gallery-card-art">
                  <button
                    className="gallery-select"
                    aria-label={`Choisir ${c.name} ${c.id}`}
                    onClick={() => onChoose(c.id)}
                  >
                    <CardImage card={c} />
                    {c.id === current && (
                      <span className="selected-label">
                        <Check size={13} /> Votre choix
                      </span>
                    )}
                  </button>
                  <button
                    className="gallery-zoom"
                    aria-label={`Agrandir ${c.name} ${c.id}`}
                    onClick={() => onZoom(c)}
                  >
                    <Maximize2 size={16} />
                  </button>
                </div>
                <button
                  className="gallery-card-caption"
                  onClick={() => onChoose(c.id)}
                >
                  <strong>{c.name}</strong>
                  <span>
                    {c.id.toUpperCase()}{" "}
                    <span style={{ color: typeColors[c.type] }}>●</span>
                  </span>
                </button>
              </article>
            ))}
          </div>
          {limit < filtered.length && (
            <div className="load-more">
              <button
                className="secondary-button"
                onClick={() => setLimit((v) => v + 60)}
              >
                Voir 60 cartes de plus <ChevronDown size={16} />
              </button>
              <span>
                {Math.min(limit, filtered.length)} sur {filtered.length}
              </span>
            </div>
          )}
        </>
      ) : (
        <div className="empty-favorites">
          <Search size={30} />
          <h3>Aucune illustration trouvée.</h3>
          <p>Essayez un autre nom ou un autre filtre.</p>
          <button
            className="text-button"
            onClick={() => {
              setSearch("");
              setType("");
              setExpansion("");
            }}
          >
            Réinitialiser la galerie
          </button>
        </div>
      )}
    </Modal>
  );
}
export default App;
