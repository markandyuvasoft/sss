const eventPosted = require("./emails/eventPosted");
const newEventNotificationPost = require("./emails/newEventPostedOrganisers");
const newProposal = require("./emails/newProposal");
const forgetPassword = require("./emails/forgetPassword");
const customersRegistration = require("./emails/customersRegistration");
const volunteerRegistration = require("./emails/voluneersRegistration");
const organisersRegistration = require("./emails/organisersRegistration");
const anonymousUserLogin = require("./emails/anonymousUserLogin");
const proposalStatusUpdate = require("./emails/proposalStatusUpdate");
const eventDeletedNotification = require("./emails/eventDeletedNotification");
const privateEventNotification = require("./emails/privateEventNotification");
// Export the templates as
module.exports = {
  eventPosted,
  newEventNotificationPost,
  newProposal,
  forgetPassword,
  customersRegistration,
  volunteerRegistration,
  organisersRegistration,
  anonymousUserLogin,
  proposalStatusUpdate,
  eventDeletedNotification,
  privateEventNotification,
};
