# Grille de sélection

Le but de ce dépôt est de **trancher**, pas d'accumuler. Sans critères écrits,
tout finit « à retravailler un jour » et rien ne sort jamais. D'où cette grille.

## Les 4 critères

Chaque jeu est noté **de 0 à 5** sur quatre axes. Total sur 20.

| Critère | Question posée | 0 | 5 |
|---|---|---|---|
| **fun30s** | Est-ce que c'est amusant dans les 30 premières secondes, sans explication ? | on décroche avant d'avoir compris | on sourit tout de suite |
| **rejouabilite** | Après un game over, est-ce qu'on relance ? | une partie a suffi | « encore une » trois fois de suite |
| **originalite** | Est-ce qu'on a déjà joué exactement à ça ? | clone strict d'un classique | angle qu'on n'avait pas vu ailleurs |
| **montrable** | Est-ce qu'on l'envoie à un pote sans s'excuser ? | il faut expliquer les bugs | on envoie le lien tel quel |

Les notes vivent dans le `meta.json` de chaque jeu :

```json
"scores": { "fun30s": 4, "rejouabilite": 4, "originalite": 3, "montrable": 4 }
```

## Le seuil

Un jeu est **retenu pour extraction** s'il remplit les deux conditions :

- **total ≥ 14 / 20**
- **aucun critère < 3** — un jeu qui excelle sur un axe mais s'effondre sur un
  autre ne survit pas à la sortie du bac à sable

Entre les deux, on peut donner **une** session de retouche ciblée, puis on
re-note. Si ça ne passe toujours pas : `abandonné`. Pas de troisième chance,
c'est le principe de la chaîne.

## Statuts

| Statut | Sens |
|---|---|
| `prototype` | codé, pas encore noté |
| `retenu` | passe le seuil, en attente d'extraction |
| `extrait` | vit dans son propre dépôt (champ `repo` renseigné) |
| `abandonné` | ne passe pas le seuil, reste ici comme archive |

## Règles de notation

- **On note après avoir joué**, pas après avoir lu le code.
- **On note à froid**, pas juste après avoir fini de le coder — l'effort investi
  gonfle systématiquement la note.
- **Deux avis valent mieux qu'un.** Si deux personnes notent, on garde la note
  la plus basse par critère : un jeu qui ne marche que pour son auteur n'est
  pas un jeu qui sort.
- **Un jeu jamais noté n'est jamais extrait.** Le statut `prototype` n'est pas
  une salle d'attente confortable : on note, ou on abandonne.
