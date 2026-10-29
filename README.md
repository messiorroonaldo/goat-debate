# GOAT Debate — Messi vs Ronaldo

Site de vote payant : **0,50 € par vote**. Les votes sont enregistrés uniquement après confirmation du paiement par webhook Stripe.

## Important
Ce projet est un socle technique prêt à configurer, pas un site déjà publié ni un compte marchand. Les paiements réels sont désactivés tant que Stripe n'est pas configuré. N'ajoutez jamais de clé secrète dans le code du navigateur et ne collectez pas les numéros de carte vous-même.

## Prérequis
- Node.js 18+
- Un compte Stripe éligible, avec identité/activité et obligations légales vérifiées.
- Un hébergement HTTPS capable d'exécuter Node.js et de conserver le fichier SQLite (ou remplacez SQLite par une base persistante managée).

## Installation
1. Décompressez le projet.
2. Dans le dossier du projet : `npm install`
3. Copiez `.env.example` vers `.env`.
4. Renseignez `STRIPE_SECRET_KEY` avec une clé **de test** Stripe et `BASE_URL`.
5. Lancez `npm start`.
6. Dans Stripe CLI, configurez le webhook local :
   `stripe listen --forward-to localhost:4242/webhook`
7. Copiez le secret `whsec_...` fourni par Stripe dans `STRIPE_WEBHOOK_SECRET`.
8. Ouvrez `http://localhost:4242`.

## Paiements
La configuration initiale accepte les cartes bancaires via Stripe Checkout. Apple Pay / Google Pay peuvent être proposés selon l'appareil, le navigateur, le domaine et la configuration Stripe. PayPal n'est pas inclus dans ce prototype et nécessite une intégration distincte.

Pour activer les paiements réels : utilisez une clé Stripe live uniquement après tests complets, activation des moyens de paiement dans le Dashboard Stripe, configuration du webhook HTTPS `/webhook`, et validation des obligations applicables (statut du vendeur, informations précontractuelles, prix TTC, conditions de vente, confidentialité, remboursements et assistance).

## Modèle de vote
- Un paiement Checkout confirmé = un vote.
- Le choix du joueur est attaché aux métadonnées de la session.
- L'identifiant de session Stripe est unique en base pour éviter les doublons.
- Les résultats publics comptent uniquement les paiements confirmés.

## À faire avant lancement public
- Ajouter mentions légales, politique de confidentialité, CGV et contact.
- Définir la politique de remboursement et le traitement des réclamations.
- Vérifier les règles applicables aux paiements, à la fiscalité et à la vente en ligne dans votre pays.
- Ajouter une protection anti-abus/rate limiting et une base de données managée pour la production.
- Faire tester le parcours de paiement, le webhook et les remboursements.
