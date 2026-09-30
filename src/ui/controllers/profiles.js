import {
  convertCsvProfileText, parseProfileText,
  getOriginalProfileSequencePositions, mapProfileDataToAccessData,
} from '../services/profile-data.js';

export function createProfilesController({ api, state, actions }) {
  const fields = state.fields;
  const getProfileIndexReference = seq => fields[`profileIdxRef${seq}`] || '1';
  function convertCsvProfileData(fieldId) {
    if (Object.hasOwn(fields, fieldId)) fields[fieldId] = convertCsvProfileText(fields[fieldId]);
  }
  function parseProfileLines(fieldId) {
    if (!Object.hasOwn(fields, fieldId)) throw { fieldId, message: `Profile data field "${fieldId}" not found.` };
    return parseProfileText(fields[fieldId], fieldId);
  }
  function parseProfileAccessData(validated, args) {
    const uncropped = api.validate({ ...args, cropping: '-1' });
    const access = {};
    for (const sequence of ['1', '2']) {
      Object.assign(access, mapProfileDataToAccessData(
        parseProfileLines(`profileData${sequence}`), sequence,
        getProfileIndexReference(sequence), validated, uncropped,
      ));
    }
    return access;
  }
  function resetProfileForm() {
    actions.resetFields(['profileData1', 'profileIdxRef1', 'profileColor1', 'profileColorRepresentsOne1',
      'profileData2', 'profileIdxRef2', 'profileColor2', 'profileColorRepresentsOne2']);
  }
  return { getProfileIndexReference, convertCsvProfileData, parseProfileLines,
    getOriginalProfileSequencePositions, mapProfileDataToAccessData, parseProfileAccessData, resetProfileForm };
}
