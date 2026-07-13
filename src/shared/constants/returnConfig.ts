export const RETURN_ADDRESS = "Naturaledibles\n<Company Return Address>";
export const RETURN_CONTACT_NUMBER = "<Company Contact Number>";

export const getReturnInstructionsTemplate = () => {
    return `Your return request has been approved.

Please securely pack the product along with all available accessories and send it through any reliable courier service to the Naturaledibles office.

Return Address:

${RETURN_ADDRESS}

Phone:

${RETURN_CONTACT_NUMBER}

Please clearly mention your Order ID on or inside the parcel.

Keep your courier receipt or tracking number until the return process has been completed.

Once we receive and inspect the returned product, we will mark your return as completed.`;
};
