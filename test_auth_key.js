
const clientId = '019c6fd3-7886-7aa5-90ba-fb24cf525be8';
const clientSecret = '1cf07933-61e7-49d8-b05b-1b65d0acd294';
const combined = `${clientId}:${clientSecret}`;
const encoded = Buffer.from(combined).toString('base64');
console.log('Generated:', encoded);
console.log('User Provided:', 'MDE5YzZmZDMtNzg4Ni03YWE1LTkwYmEtZmIyNGNmNTI1YmU4OjFjZjA3OTMzLTYxZTctNDlkOC1iMDViLTFiNjVkMGFjZDI5NA==');
console.log('Match:', encoded === 'MDE5YzZmZDMtNzg4Ni03YWE1LTkwYmEtZmIyNGNmNTI1YmU4OjFjZjA3OTMzLTYxZTctNDlkOC1iMDViLTFiNjVkMGFjZDI5NA==');
