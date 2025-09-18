const Proposal = require("../models/Proposal");
const Event = require("../models/Event");
const privateEvent = require("../models/privateEvent");
const Portfolio = require("../models/Portfolio");
const { sendNotification } = require("../services/notificationService");
const templates = require("../templates/index");
const Notification = require("../models/Notification");
// Test
// Event Manager: Submit Proposal
const sendProposal = async (req, res) => {
  const {
    eventId,
    eventModel = "Event",
    proposedBudget,
    proposalDescription,
    servicesBreakdown = [],
    additionalNotes = "",
    currency,
  } = req.body;

  try {
    // Validate manager role
    if (
      !req.user ||
      !req.user.id ||
      !["event-manager", "event-agency", "independent"].includes(req.user.role)
    ) {
      return res
        .status(401)
        .json({ message: "Unauthorized: Only managers can submit proposals" });
    }
    // Find event based on model
    let event;
    let Model;
    if (eventModel === "Event") {
      Model = Event;
      event = await Event.findById(eventId).populate(
        "customer",
        "fullName email"
      );
      if (!event) {
        console.error("Event not found for ID:", eventId);
        return res.status(404).json({ message: "Event not found" });
      }
      if (event.isPrivate && event.assignedTo?.toString() !== req.user.id) {
        return res
          .status(403)
          .json({
            message:
              "You are not authorized to submit a proposal for this private event",
          });
      }
    } else if (eventModel === "PrivateEvent") {
      Model = privateEvent;
      event = await privateEvent
        .findById(eventId)
        .populate("customer", "fullName email");
      if (!event) {
        console.error("Private event not found for ID:", eventId);
        return res.status(404).json({ message: "Private event not found" });
      }
      if (event.assignedManager.toString() !== req.user.id) {
        return res
          .status(403)
          .json({
            message:
              "You are not authorized to submit a proposal for this private event",
          });
      }
    } else {
      return res.status(400).json({ message: "Invalid event model" });
    }

    // Check if the user has a portfolio
    const portfolio = await Portfolio.findOne({ user: req.user.id });
    if (!portfolio) {
      return res.status(403).json({
        message: "You must create a portfolio before submitting a proposal",
      });
    }

    //Check if event manager already sent a proposal
    const existingProposal = await Proposal.findOne({
      eventId,
      managerId: req.user.id,
      eventModel,
    });
    if (existingProposal) {
      return res
        .status(400)
        .json({
          message: "You have already submitted a proposal for this event",
        });
    }

    // Validate services breakdown and amounts
    if (!Array.isArray(servicesBreakdown)) {
      return res.status(400).json({ message: "servicesBreakdown must be an array" });
    }

    const normalizedBreakdown = servicesBreakdown.map((item) => ({
      service: String(item?.service || "").trim(),
      desc: String(item?.desc || "").trim(),
      qty: Number(item?.qty ?? 1),
      unitPrice: Number(item?.unitPrice ?? 0),
    }));

    // Ensure required fields
    for (const li of normalizedBreakdown) {
      if (!li.service) {
        return res.status(400).json({ message: "Each line item must have service" });
      }
      if (!Number.isFinite(li.qty) || li.qty < 1) {
        return res.status(400).json({ message: "Each line item must have qty >= 1" });
      }
      if (!Number.isFinite(li.unitPrice) || li.unitPrice < 0) {
        return res.status(400).json({ message: "Each line item must have unitPrice >= 0" });
      }
    }

    const breakdownTotal = normalizedBreakdown.reduce(
      (sum, li) => sum + li.qty * li.unitPrice,
      0
    );

    if (!Number.isFinite(Number(proposedBudget))) {
      return res.status(400).json({ message: "proposedBudget must be a number" });
    }

    if (breakdownTotal > Number(proposedBudget)) {
      return res.status(400).json({
        message: "Services Breakdown total must not exceed the proposed budget",
        breakdownTotal,
        proposedBudget: Number(proposedBudget),
      });
    }

    const proposal = new Proposal({
      eventId,
      eventModel,
      managerId: req.user.id,
      proposedBudget,
      proposalDescription,
      servicesBreakdown: normalizedBreakdown,
      additionalNotes,
      currency: currency || "INR", // Default to INR if not provided
    });

    await proposal.save();

    // Update event to set isProposalSent: true
    await Model.findByIdAndUpdate(eventId, { $set: { isProposalSent: true } });

    console.log("Proposal saved:", proposal); // Log proposal data
    console.log("Customer email:", event.customer.email);

    const baseUrl = process.env.BASE_URL;
    const proposalLink = `${baseUrl}`;

    // Get event manager details
    const eventManager = req.user; // Assuming req.user contains manager details

    // Use email template
    const emailContent = templates.newProposal(
      event.customer.fullName || "Customer", // Customer name
      event.eventName, // Event name
      eventManager.fullName || "Event Manager", // Event manager name
      proposedBudget,
      currency || "INR", // Assuming currency is USD (Modify as needed)
      proposalDescription,
      proposalLink
    );

    // Notify the customer
    await sendNotification(event.customer.email, "New Proposal Received!", emailContent, 'email');
    
    // Save notification to database
    const notification = new Notification({
      recipient: event.customer._id,
      message: `New proposal received for event: ${event.eventName}`,
      type: 'email',
      status: 'sent'
    });
    await notification.save();

    res.status(201).json({ message: 'Proposal submitted successfully', proposal });

    // Notify the customer
    // await sendNotification(
    //   event.customer.email,
    //   "New Proposal Received!",
    //   emailContent
    // );
    // // Notify the customer
    // res
    //   .status(201)
    //   .json({ message: "Proposal submitted successfully", proposal });
  } catch (error) {
    console.error("Error in sendProposal:", error.message);
    res
      .status(500)
      .json({ message: "Failed to submit proposal", error: error.message });
  }
};

const viewProposals = async (req, res) => {
  try {
    if (req.user.role !== "customer") {
      return res.status(403).json({ message: "Access denied" });
    }

    // Get all relevant event IDs
    const publicEvents = await Event.find({ customer: req.user.id }, "_id");
    const privateEvents = await privateEvent.find(
      { customer: req.user.id },
      "_id"
    );
    const eventIds = [...publicEvents, ...privateEvents].map(
      (event) => event._id
    );

    // Fetch proposals with population
    const proposals = await Proposal.find({ eventId: { $in: eventIds } })
      .populate('managerId', 'fullName email profilePicture')
      .populate({
        path: 'eventId',
        select: 'eventName eventType startDate budget',
      })
      .lean();

    // Collect manager (planner) ids to fetch their portfolios
    const managerIds = proposals
      .map((p) => p?.managerId?._id)
      .filter((id) => !!id);

    const portfolios = managerIds.length
      ? await Portfolio.find(
          { user: { $in: managerIds } },
          'user profilePicture about'
        ).lean()
      : [];

    const portfolioByUser = new Map(
      portfolios.map((pf) => [String(pf.user), pf])
    );

    const enhanced = proposals.map((p) => {
      const userPic = p?.managerId?.profilePicture || null;
      const pf = p?.managerId?._id
        ? portfolioByUser.get(String(p.managerId._id))
        : null;
      const portfolioPic = pf?.profilePicture?.url || null;
      const portfolioAbout = pf?.about || '';
      return {
        ...p,
        plannerName: p?.managerId?.fullName || p?.managerId?.name || '',
        // Prefer user.profilePicture; fallback to portfolio.profilePicture.url
        plannerProfilePicture: userPic || portfolioPic || null,
        plannerAbout: portfolioAbout,
      };
    });

    res.status(200).json(enhanced);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch proposals", error: error.message });
  }
};

// Update Proposal Status
const updateProposalStatus = async (req, res) => {
  const { proposalId } = req.params;
  const { status } = req.body;

  try {
    // Validate status
    if (!["pending", "accepted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    // Find proposal
    const proposal = await Proposal.findById(proposalId).populate(
      "managerId",
      "fullName email"
    );
    if (!proposal) {
      return res.status(404).json({ message: "Proposal not found" });
    }

    // Determine event model and fetch event
    let event;
    if (proposal.eventModel === "Event") {
      event = await Event.findById(proposal.eventId).populate(
        "customer",
        "fullName email"
      );
    } else if (proposal.eventModel === "PrivateEvent") {
      event = await privateEvent
        .findById(proposal.eventId)
        .populate("customer", "fullName email");
    } else {
      return res
        .status(400)
        .json({ message: "Invalid event model in proposal" });
    }

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Authorization check
    if (event.customer._id.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this proposal" });
    }

    // Update proposal status
    proposal.status = status;
    await proposal.save();

    // Notify event manager
    const baseUrl = process.env.CLIENT_URL;
    const proposalLink = `${baseUrl}`;
    const managerEmailContent = templates.proposalStatusUpdate(
      proposal.managerId.fullName || "Event Manager",
      event.eventName, // Use eventName instead of eventTitle
      status,
      proposalLink
    );

    await sendNotification(
      proposal.managerId.email,
      `Your proposal for event "${event.eventName}" has been ${status}.`,
      managerEmailContent,
      "email"
    );

    const notification = new Notification({
      recipient: proposal.managerId._id,
      message: `Your proposal for event "${event.eventName}" has been ${status}.`,
      type: 'email',
      status: 'sent'
    });
    await notification.save();

    res.status(200).json({ message: "Proposal status updated", proposal });
  } catch (error) {
    console.error("Error in updateProposalStatus:", error.message);
    res
      .status(500)
      .json({
        message: "Failed to update proposal status",
        error: error.message,
      });
  }
};

// Event Manager: Edit Proposal
const editProposal = async (req, res) => {
  const { proposalId } = req.params;
  const { proposedBudget, proposalDescription, servicesBreakdown, additionalNotes, currency } =
    req.body;

  try {
    const proposal = await Proposal.findById(proposalId);
    if (!proposal || proposal.managerId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to edit this proposal" });
    }

    // Prevent updates if proposal is accepted
    // if (proposal.status === "accepted") {
    //   return res
    //     .status(403)
    //     .json({ message: "Cannot update an accepted proposal" });
    // }

    // Check if event exists
    let event;
    if (proposal.eventModel === "Event") {
      event = await Event.findById(proposal.eventId);
    } else if (proposal.eventModel === "PrivateEvent") {
      event = await privateEvent.findById(proposal.eventId);
    }
    if (!event) {
      return res
        .status(404)
        .json({
          message: "Cannot update proposal: Associated event not found",
        });
    }
    proposal.currency = currency || proposal.currency;
    const newBudget = proposedBudget ?? proposal.proposedBudget;
    proposal.proposedBudget = newBudget;
    proposal.proposalDescription =
      proposalDescription ?? proposal.proposalDescription;

    // Update services breakdown if provided
    if (Array.isArray(servicesBreakdown)) {
      const normalized = servicesBreakdown.map((item) => ({
        service: String(item?.service || "").trim(),
        desc: String(item?.desc || "").trim(),
        qty: Number(item?.qty ?? 1),
        unitPrice: Number(item?.unitPrice ?? 0),
      }));

      for (const li of normalized) {
        if (!li.service) {
          return res.status(400).json({ message: "Each line item must have service" });
        }
        if (!Number.isFinite(li.qty) || li.qty < 1) {
          return res.status(400).json({ message: "Each line item must have qty >= 1" });
        }
        if (!Number.isFinite(li.unitPrice) || li.unitPrice < 0) {
          return res.status(400).json({ message: "Each line item must have unitPrice >= 0" });
        }
      }

      const breakdownTotal = normalized.reduce((s, li) => s + li.qty * li.unitPrice, 0);
      if (breakdownTotal > Number(newBudget)) {
        return res.status(400).json({
          message: "Services Breakdown total must not exceed the proposed budget",
          breakdownTotal,
          proposedBudget: Number(newBudget),
        });
      }

      proposal.servicesBreakdown = normalized;
    }

    if (typeof additionalNotes === 'string') {
      proposal.additionalNotes = additionalNotes;
    }

    await proposal.save();

    res
      .status(200)
      .json({ message: "Proposal updated successfully", proposal });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update proposal", error: error.message });
  }
};

// Event Manager: View Sent Proposals
// const viewSentProposals = async (req, res) => {
//   try {
//     if(!['event-manager', 'event-agency'].includes(req.user.role)){
//       return res.status(403).json({message: 'Access denied'});
//     }

//     const proposals = await Proposal.find({ managerId: req.user.id })
//       .populate([{
//         path: 'eventId',
//         match:{_id:{$exists:true}},
//         select: 'eventName eventType startDate budget',
//         model:'Event',// for public events
//       },
//       {
//         path:'eventId',
//         match:{_id:{$exists:true}},
//         select:'eventName eventType startDate budget',
//         model:'PrivateEvent',// for private events
//       }
//     ])//populate event details
//       .populate('managerId', 'fullName email')
//       .lean(); // Convert to plain JS object for easier manipulation

//       // Flag proposals with no associated event
//     const enhancedProposals = proposals.map(proposal => ({
//       ...proposal,
//       isOrphaned: !proposal.eventId, // Add flag for frontend
//     }));

//     if (!enhancedProposals.length) {
//       return res.status(200).json({ message: 'No proposals found', proposals: [] });
//     }

//     res.status(200).json({
//       message: 'Sent proposals retrieved successfully',
//       proposals: enhancedProposals,
//     });
//     }catch (error) {
//       console.error('Error in viewSentProposals:', error.message);
//       res.status(500).json({ message: 'Failed to fetch sent proposals', error: error.message });
//     }
// }
const viewSentProposals = async (req, res) => {
  try {
    if (!["event-manager","event-agency", "independent"].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // 1) find raw proposals
    const raw = await Proposal.find({ managerId: req.user.id }).lean();

    // 2) for each, manually populate eventId from the correct collection
    const populated = await Promise.all(
      raw.map(async (prop) => {
        const Model = prop.eventModel === "Event" ? Event : privateEvent;
        // if prop.eventId is null, findById will just return null
        const ev = await Model.findById(
          prop.eventId,
          "eventName eventType startDate budget"
        ).lean();
        return {
          ...prop,
          eventId: ev || null,
          isOrphaned: !ev,
        };
      })
    );

    return res.status(200).json({
      message: "Sent proposals retrieved successfully",
      proposals: populated,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Failed to fetch sent proposals", error: err.message });
  }
};

// Event Manager: Delete Proposal
const deleteProposal = async (req, res) => {
  const { proposalId } = req.params;

  try {
    const proposal = await Proposal.findById(proposalId);
    if (!proposal || proposal.managerId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this proposal" });
    }

    await proposal.deleteOne();
    res.status(200).json({ message: "Proposal deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to delete proposal", error: error.message });
  }
};

module.exports = {
  sendProposal,
  viewProposals,
  editProposal,
  deleteProposal,
  viewSentProposals,
  updateProposalStatus
};
