import {
  BigInt,
  Bytes,
  ipfs,
  json,
  log,
  JSONValue,
  JSONValueKind,
} from '@graphprotocol/graph-ts';

import { Agreement } from '../../../types/schema';
import { InvoiceObject, addQm } from '../utils';

function handleAgreementFile(projectArray: Array<JSONValue>): Agreement[] {
  let agreementArray = new Array<Agreement>();

  for (let i = 0; i < projectArray.length; i++) {
    if (projectArray[i].kind != JSONValueKind.OBJECT) return agreementArray;

    let obj = projectArray[i].toObject();
    let type = obj.get('type');
    let src = obj.get('src');
    let createdAt = obj.get('createdAt');
    if (!type || type.isNull() || type.kind != JSONValueKind.STRING) return agreementArray;
    if (!src || src.isNull() || src.kind != JSONValueKind.STRING) return agreementArray;
    if (!createdAt || createdAt.isNull() || createdAt.kind != JSONValueKind.STRING) return agreementArray;
    let typeValue = type.toString();
    let srcValue = src.toString();
    let createdAtValue = BigInt.fromString(createdAt.toString());

    let agreement = new Agreement(createdAtValue.toString());

    agreement.type = typeValue;
    agreement.src = srcValue;
    agreement.createdAt = createdAtValue;

    log.info(
      'agreement commit: agreement.type {} agreement.src {} agreement.createdAt {} index {}',
      [
        agreement.type,
        agreement.src,
        agreement.createdAt.toString(),
        i.toString(),
      ],
    );

    agreement.save();

    agreementArray[i] = agreement;
  }

  return agreementArray;
}

export function handleIpfsDetails(
  details: Bytes,
  invoiceObject: InvoiceObject,
): InvoiceObject {
  invoiceObject.details = details;
  if (
    details.toString() ==
    '0x0000000000000000000000000000000000000000000000000000000000000000'
  ) {
    return invoiceObject;
  }

  let hexHash = changetype<Bytes>(addQm(invoiceObject.details));
  let base58Hash = hexHash.toBase58();
  let ipfsHash = base58Hash.toString();
  invoiceObject.ipfsHash = ipfsHash;
  // ignore bad data
  if (ipfsHash == 'QmUEryz1WnGKfrJzB5N4rrnGdrD5qqV5f9hVKN7sihKmd3') {
    return invoiceObject;
  }
  let ipfsData = ipfs.cat(base58Hash);
  if (ipfsData === null) {
    log.info('IPFS data is null for hash {}', [base58Hash]);
    return invoiceObject;
  }

  log.info('IPFS details from hash {}, data {}', [
    base58Hash,
    ipfsData.toString(),
  ]);
  let data = json.fromBytes(ipfsData).toObject();
  let projectName = data.get('projectName');
  if (projectName != null && !projectName.isNull()) {
    invoiceObject.projectName = projectName.toString();
  }
  let projectDescription = data.get('projectDescription');
  if (projectDescription != null && !projectDescription.isNull()) {
    invoiceObject.projectDescription = projectDescription.toString();
  }
  let projectAgreement = data.get('projectAgreement');

  if (
    projectAgreement != null &&
    !projectAgreement.isNull() &&
    projectAgreement.kind != JSONValueKind.STRING &&
    projectAgreement.kind != JSONValueKind.OBJECT &&
    projectAgreement.kind != JSONValueKind.NUMBER
  ) {
    log.info('projectAgreement kind {}', [projectAgreement.kind.toString()]);
    let projectArray = projectAgreement.toArray();

    let agreementArray = handleAgreementFile(projectArray);

    if (agreementArray) {
      invoiceObject.projectAgreement = agreementArray;
    }
  }
  let startDate = data.get('startDate');
  if (
    startDate != null &&
    !startDate.isNull() &&
    startDate.kind == JSONValueKind.NUMBER
  ) {
    invoiceObject.startDate = startDate.toBigInt();
  }
  let endDate = data.get('endDate');
  if (
    endDate != null &&
    !endDate.isNull() &&
    endDate.kind == JSONValueKind.NUMBER
  ) {
    invoiceObject.endDate = endDate.toBigInt();
  }

  return invoiceObject;
}
