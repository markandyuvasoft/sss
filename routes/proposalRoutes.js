const express = require("express");
const {
  sendProposal,
  viewProposals,
  editProposal,
  deleteProposal,
  viewSentProposals,
  updateProposalStatus,
} = require("../controllers/proposalController");
const protect = require("../middlewares/authMiddleware");

const router = express.Router();

// Event Manager: Submit Proposal
router.post("/send", protect(["event-manager", "event-agency", "independent"]), sendProposal);

// View Proposals (Event Manager / Customer)
router.get("/", protect(["customer"]), viewProposals);

// View Sent Proposals (Event Manager)
router.get("/sent", protect(["event-manager", "event-agency", "independent"]), viewSentProposals)

// Update Proposal Status (Customer) - removed (Decline/Accept disabled)

router.put(
  "/:proposalId/status",
  protect(["customer"]),
  updateProposalStatus
);

// Edit Proposal (Event Manager)
router.put(
  "/:proposalId",
  protect(["event-manager", "event-agency", "independent"]),
  editProposal
);

// Delete Proposal (Event Manager)
router.delete(
  "/:proposalId",
  protect(["event-manager", "event-agency", "independent"]),
  deleteProposal
);

module.exports = router;
