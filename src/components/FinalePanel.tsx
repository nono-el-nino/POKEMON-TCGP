import { useState } from "react";
import { Check, CloudOff, Crown, Eye, Layers, Trophy } from "lucide-react";
import { getFinale } from "../finale.mjs";
import {
  cardCategory,
  cardImageUrl,
  rarityLabel,
  rarityName,
  type Card,
  type Collection,
} from "../model";
function Art({ card }: { card: Card }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <div className="finale-art-fallback">
      <CloudOff size={22} />
      <span>Illustration indisponible</span>
      <small>{card.id.toUpperCase()}</small>
    </div>
  ) : (
    <img
      src={cardImageUrl(card)}
      alt={`${card.name} — ${card.id.toUpperCase()}`}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
export default function FinalePanel({
  cards,
  collection,
  onWinner,
  onUltimate,
  onZoom,
  onStart,
}: {
  cards: Card[];
  collection: Collection;
  onWinner: (key: string, id: string | null) => void;
  onUltimate: (id: string | null) => void;
  onZoom: (c: Card) => void;
  onStart: () => void;
}) {
  const result = getFinale(cards, collection.winners, collection.absolute),
    previous = cards.find((c) => c.id === collection.previousAbsolute);
  return (
    <section
      className="finale-panel"
      id="podium"
      aria-labelledby="podium-title"
    >
      <div className="finale-heading">
        <div>
          <div className="eyebrow">
            <Trophy size={15} /> LE NIVEAU CHAPEAU
          </div>
          <h2 id="podium-title">
            Le grand podium<span>.</span>
          </h2>
          <p>Vos favoris → une gagnante par rareté → votre préférée ultime.</p>
        </div>
        <span className="finale-progress">
          {result.resolved}/{result.total} raretés départagées
        </span>
      </div>
      <div className="finale-step-heading">
        <b>1</b>
        <div>
          <h3>La gagnante de chaque rareté</h3>
          <p>
            Comparez uniquement les cartes que vous avez choisies, dans les deux
            matrices. Une seule candidate se qualifie directement.
          </p>
        </div>
      </div>
      {!result.total ? (
        <div className="finale-empty">
          <Layers size={28} />
          <p>Votre podium attend ses premières candidates.</p>
          <button className="secondary-button" onClick={onStart}>
            Choisir mes premières cartes
          </button>
        </div>
      ) : (
        <div className="rarity-playoffs">
          {result.groups.map((group) => (
            <details
              className={`rarity-playoff ${group.champion ? "resolved" : ""}`}
              key={group.key}
            >
              <summary>
                <span className="playoff-symbol">{rarityLabel(group.key)}</span>
                <div>
                  <strong>{rarityName(group.key)}</strong>
                  <span>
                    {group.champion
                      ? `${group.champion.name} · ${group.champion.id.toUpperCase()}`
                      : `${group.candidates.length} favorites à départager`}
                  </span>
                  <small>
                    {group.automatic
                      ? "Seule candidate qualifiée"
                      : group.champion
                        ? "Votre gagnante"
                        : "Choisissez votre gagnante"}
                  </small>
                </div>
                {group.champion ? <Check size={18} /> : <Trophy size={18} />}
              </summary>
              <div className="playoff-candidates">
                {group.candidates.map((card) => (
                  <article
                    key={card.id}
                    className={group.champion?.id === card.id ? "chosen" : ""}
                  >
                    <div className="playoff-art">
                      <Art card={card} />
                      <button
                        className="playoff-zoom"
                        onClick={() => onZoom(card)}
                        aria-label={`Agrandir la candidate ${card.name} ${card.id}`}
                      >
                        <Eye size={15} />
                      </button>
                    </div>
                    <strong>{card.name}</strong>
                    <span>{card.id.toUpperCase()}</span>
                    <button
                      className="secondary-button"
                      aria-pressed={group.champion?.id === card.id}
                      aria-label={`Élire ${card.name} ${card.id} en ${rarityName(group.key)}`}
                      disabled={group.automatic}
                      onClick={() => onWinner(group.key, card.id)}
                    >
                      {group.champion?.id === card.id ? (
                        <>
                          <Check size={13} /> Qualifiée
                        </>
                      ) : (
                        <>
                          Choisir <Trophy size={13} />
                        </>
                      )}
                    </button>
                  </article>
                ))}
              </div>
              {group.champion &&
                !group.automatic &&
                group.candidates.length > 1 && (
                  <button
                    className="text-button"
                    onClick={() => onWinner(group.key, null)}
                  >
                    Remettre cette rareté à départager
                  </button>
                )}
            </details>
          ))}
        </div>
      )}
      <div className="finale-step-heading ultimate-step">
        <b>2</b>
        <div>
          <h3>Votre préférée ultime</h3>
          <p>
            Le dernier choix se fait exclusivement parmi les gagnantes de
            rareté.
          </p>
        </div>
      </div>
      {!result.ready && result.total > 0 && (
        <p className="finale-lock">
          Encore {result.unresolved} rareté{result.unresolved > 1 ? "s" : ""} à
          départager pour ouvrir la finale.
        </p>
      )}
      {previous && !result.ultimate && (
        <p className="previous-favorite">
          Ancien coup de cœur conservé :{" "}
          <strong>
            {previous.name} · {previous.id.toUpperCase()}
          </strong>
          . Qualifiez vos gagnantes, puis confirmez votre préférée ultime.
        </p>
      )}
      {result.champions.length > 0 && (
        <div className="ultimate-candidates">
          {result.champions.map((card) => (
            <article
              key={card.id}
              className={
                result.ultimate?.id === card.id ? "ultimate-chosen" : ""
              }
            >
              <button
                className="ultimate-art"
                onClick={() => onZoom(card)}
                aria-label={`Voir la finaliste ${card.name} ${card.id}`}
              >
                <Art card={card} />
              </button>
              <span className="finalist-rarity">
                {rarityName(cardCategory(card))}
              </span>
              <strong>{card.name}</strong>
              <span className="finalist-id">{card.id.toUpperCase()}</span>
              <button
                className="primary-button"
                disabled={!result.ready}
                aria-pressed={result.ultimate?.id === card.id}
                onClick={() => onUltimate(card.id)}
                aria-label={`Choisir ${card.name} ${card.id} comme préférée ultime`}
              >
                <Crown size={15} />
                {result.ultimate?.id === card.id
                  ? "Ma préférée ultime"
                  : "Choisir cette finaliste"}
              </button>
            </article>
          ))}
        </div>
      )}
      {result.ultimate && (
        <div className="ultimate-result" aria-live="polite">
          <Crown size={24} />
          <div>
            <span>MA PRÉFÉRÉE ULTIME</span>
            <strong>
              {result.ultimate.name}{" "}
              <small>{result.ultimate.id.toUpperCase()}</small>
            </strong>
            <p>Issue de votre podium, choisie par vous.</p>
          </div>
          <button className="text-button" onClick={() => onUltimate(null)}>
            Retirer ce choix
          </button>
        </div>
      )}
      <p className="finale-note">
        Seules les raretés dans lesquelles vous avez des favoris participent.
        Chaque impression compte une fois ; le Top 10 reste indépendant.
      </p>
    </section>
  );
}
