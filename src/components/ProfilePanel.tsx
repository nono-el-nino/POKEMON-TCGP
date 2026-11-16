import { Download, Sparkles } from "lucide-react";
import { AXES, PROFILES, computeProfile } from "../personality.mjs";
import type { Card } from "../model";
export function ScoreBars({ scores }: { scores: Record<string, number> }) {
  return (
    <div className="profile-scores">
      {AXES.map((axis) => (
        <div className="profile-axis" key={axis.id}>
          <div>
            <span>{axis.name}</span>
            <strong>
              {scores[axis.id].toLocaleString("fr-FR", {
                maximumFractionDigits: 1,
              })}
              <small>/100</small>
            </strong>
          </div>
          <div
            className="profile-track"
            role="meter"
            aria-label={axis.name}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={scores[axis.id]}
          >
            <span
              style={{ width: `${scores[axis.id]}%`, background: axis.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
export default function ProfilePanel({
  cards,
  onExport,
  busy,
}: {
  cards: Card[];
  onExport: () => void;
  busy: boolean;
}) {
  const result = computeProfile(cards);
  return (
    <section
      className="collector-profile"
      aria-labelledby="collector-profile-title"
    >
      <div className="profile-intro">
        <div className="eyebrow">
          <Sparkles size={15} /> VOTRE SIGNATURE DE COLLECTIONNEUR
        </div>
        <h2 id="collector-profile-title">
          {result?.profile?.name || "Vos goûts ont une signature."}
        </h2>
        <p>
          {result?.profile?.description ||
            "Choisissez des illustrations dans la matrice pour découvrir votre profil parmi douze signatures."}
        </p>
        {result && (
          <div className="profile-count">
            {result.count} illustration{result.count > 1 ? "s" : ""} distincte
            {result.count > 1 ? "s" : ""} ·{" "}
            {result.provisional
              ? "Première tendance, à affiner dès 3 cartes"
              : "Moyenne de vos choix"}
            {result.balanced ? " · Deux dimensions proches" : ""}
          </div>
        )}
        <button
          className="primary-button"
          disabled={!result || busy}
          onClick={onExport}
        >
          <Download size={16} />
          {busy ? "Préparation du PNG…" : "Télécharger mon résultat PNG"}
        </button>
      </div>
      <div className="profile-measures">
        {result ? (
          <ScoreBars scores={result.scores} />
        ) : (
          <div className="profile-placeholder">
            <Sparkles size={30} />
            <p>Douceur · Énergie · Mystère · Éclat</p>
            <span>Une illustration à la fois, votre profil prend forme.</span>
          </div>
        )}
      </div>
      <details className="profile-method">
        <summary>Comment mon profil est-il calculé ?</summary>
        <div>
          <p>
            Une lecture ludique de vos goûts de collection. Chaque carte reçoit
            quatre notes de 0 à 100 : 60 % viennent de l’illustration
            (luminosité, saturation, contraste et détails), 40 % du Pokémon
            (type, stade, statut EX et attributs bébé, légendaire ou fabuleux).
            Les Dresseurs utilisent une base neutre pour cette seconde part.
          </p>
          <p>
            La moyenne donne le même poids à chaque impression distincte. Une
            carte présente dans les deux matrices compte une seule fois ; le Top
            10 et le favori absolu ne modifient pas les notes. Les deux
            dimensions les plus hautes, dans l’ordre, déterminent l’un des 12
            profils. En cas d’égalité exacte, l’ordre fixe est Douceur, Énergie,
            Mystère, Éclat. Le résultat reste une tendance provisoire avant 3
            cartes.
          </p>
          <p>
            Les couleurs et les textures sont mesurées dans la zone illustrée ;
            le système ne reconnaît pas les scènes. Ces scores décrivent des
            préférences visuelles, pas une évaluation psychologique. Même
            sélection, mêmes données, même signature (méthode v1).
          </p>
          <div className="axis-legend">
            {AXES.map((a) => (
              <p key={a.id}>
                <strong
                  style={{
                    color: "#42583a",
                    borderLeft: `3px solid ${a.color}`,
                    paddingLeft: 7,
                  }}
                >
                  {a.name}
                </strong>{" "}
                — {a.description}
              </p>
            ))}
          </div>
          <h3>Les douze signatures</h3>
          <div className="profile-types">
            {PROFILES.map((p) => (
              <div key={p.key}>
                <strong>{p.name}</strong>
                <span>{p.description}</span>
              </div>
            ))}
          </div>
        </div>
      </details>
    </section>
  );
}
