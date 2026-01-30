class IPFSService {
  private localGateway = 'http://localhost:8080/ipfs/';
  
  private publicGateway = 'https://ipfs.io/ipfs/';

  getImageUrl(ipfsHash: string): string {
    const hash = ipfsHash.replace('ipfs://', '');
    
    return `${this.localGateway}${hash}`;
  }

  getPublicImageUrl(ipfsHash: string): string {
    const hash = ipfsHash.replace('ipfs://', '');
    return `${this.publicGateway}${hash}`;
  }
}

export default new IPFSService();