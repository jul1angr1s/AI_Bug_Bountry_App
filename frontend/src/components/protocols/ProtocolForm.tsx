import { useState } from 'react';
import type { CreateProtocolRequest } from '../../lib/api';

interface ProtocolFormProps {
  onSubmit: (data: CreateProtocolRequest) => Promise<void>;
  isSubmitting?: boolean;
}

interface FormErrors {
  name?: string;
  githubUrl?: string;
  contractPath?: string;
  contractName?: string;
  bountyPoolAddress?: string;
}

export default function ProtocolForm({ onSubmit, isSubmitting = false }: ProtocolFormProps) {
  const [formData, setFormData] = useState<CreateProtocolRequest>({
    name: '',
    githubUrl: '',
    branch: 'main',
    contractPath: '',
    contractName: '',
    bountyPoolAddress: '',
    network: 'base-sepolia',
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const validateGitHubUrl = (url: string): boolean => {
    const githubPattern = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+$/;
    return githubPattern.test(url);
  };

  const validateEthereumAddress = (address: string): boolean => {
    const addressPattern = /^0x[a-fA-F0-9]{40}$/;
    return addressPattern.test(address);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Protocol name is required';
    }

    if (!formData.githubUrl.trim()) {
      newErrors.githubUrl = 'GitHub URL is required';
    } else if (!validateGitHubUrl(formData.githubUrl)) {
      newErrors.githubUrl = 'Must be a valid GitHub repository URL (https://github.com/owner/repo)';
    }

    if (!formData.contractPath.trim()) {
      newErrors.contractPath = 'Contract path is required';
    } else if (!formData.contractPath.endsWith('.sol')) {
      newErrors.contractPath = 'Contract path must end with .sol';
    }

    if (!formData.contractName.trim()) {
      newErrors.contractName = 'Contract name is required';
    }

    if (!formData.bountyPoolAddress.trim()) {
      newErrors.bountyPoolAddress = 'Bounty pool address is required';
    } else if (!validateEthereumAddress(formData.bountyPoolAddress)) {
      newErrors.bountyPoolAddress = 'Must be a valid Ethereum address (0x...)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleChange = (field: keyof CreateProtocolRequest, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Protocol Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
          Protocol Name *
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          className={`w-full px-4 py-2 bg-[#1a1f2e] border ${
            errors.name ? 'border-red-500' : 'border-gray-700'
          } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
          placeholder="Thunder Loan Protocol"
          disabled={isSubmitting}
        />
        {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
      </div>

      {/* GitHub URL */}
      <div>
        <label htmlFor="githubUrl" className="block text-sm font-medium text-gray-300 mb-2">
          GitHub Repository URL *
        </label>
        <input
          type="text"
          id="githubUrl"
          value={formData.githubUrl}
          onChange={(e) => handleChange('githubUrl', e.target.value)}
          className={`w-full px-4 py-2 bg-[#1a1f2e] border ${
            errors.githubUrl ? 'border-red-500' : 'border-gray-700'
          } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
          placeholder="https://github.com/Cyfrin/2023-11-Thunder-Loan"
          disabled={isSubmitting}
        />
        {errors.githubUrl && <p className="mt-1 text-sm text-red-500">{errors.githubUrl}</p>}
      </div>

      {/* Branch */}
      <div>
        <label htmlFor="branch" className="block text-sm font-medium text-gray-300 mb-2">
          Branch
        </label>
        <input
          type="text"
          id="branch"
          value={formData.branch}
          onChange={(e) => handleChange('branch', e.target.value)}
          className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="main"
          disabled={isSubmitting}
        />
      </div>

      {/* Contract Path */}
      <div>
        <label htmlFor="contractPath" className="block text-sm font-medium text-gray-300 mb-2">
          Contract Path *
        </label>
        <input
          type="text"
          id="contractPath"
          value={formData.contractPath}
          onChange={(e) => handleChange('contractPath', e.target.value)}
          className={`w-full px-4 py-2 bg-[#1a1f2e] border ${
            errors.contractPath ? 'border-red-500' : 'border-gray-700'
          } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
          placeholder="src/protocol/ThunderLoan.sol"
          disabled={isSubmitting}
        />
        {errors.contractPath && <p className="mt-1 text-sm text-red-500">{errors.contractPath}</p>}
      </div>

      {/* Contract Name */}
      <div>
        <label htmlFor="contractName" className="block text-sm font-medium text-gray-300 mb-2">
          Contract Name *
        </label>
        <input
          type="text"
          id="contractName"
          value={formData.contractName}
          onChange={(e) => handleChange('contractName', e.target.value)}
          className={`w-full px-4 py-2 bg-[#1a1f2e] border ${
            errors.contractName ? 'border-red-500' : 'border-gray-700'
          } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
          placeholder="ThunderLoan"
          disabled={isSubmitting}
        />
        {errors.contractName && <p className="mt-1 text-sm text-red-500">{errors.contractName}</p>}
      </div>

      {/* Bounty Pool Address */}
      <div>
        <label htmlFor="bountyPoolAddress" className="block text-sm font-medium text-gray-300 mb-2">
          Bounty Pool Address *
        </label>
        <input
          type="text"
          id="bountyPoolAddress"
          value={formData.bountyPoolAddress}
          onChange={(e) => handleChange('bountyPoolAddress', e.target.value)}
          className={`w-full px-4 py-2 bg-[#1a1f2e] border ${
            errors.bountyPoolAddress ? 'border-red-500' : 'border-gray-700'
          } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
          placeholder="0x..."
          disabled={isSubmitting}
        />
        {errors.bountyPoolAddress && (
          <p className="mt-1 text-sm text-red-500">{errors.bountyPoolAddress}</p>
        )}
        <p className="mt-1 text-sm text-gray-500">
          Existing deployed BountyPool contract address on Base Sepolia
        </p>
      </div>

      {/* Network */}
      <div>
        <label htmlFor="network" className="block text-sm font-medium text-gray-300 mb-2">
          Network
        </label>
        <select
          id="network"
          value={formData.network}
          onChange={(e) => handleChange('network', e.target.value)}
          className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          disabled={isSubmitting}
        >
          <option value="base-sepolia">Base Sepolia</option>
          <option value="base">Base Mainnet</option>
          <option value="ethereum-sepolia">Ethereum Sepolia</option>
        </select>
      </div>

      {/* Submit Button */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-[#0f1419] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Registering Protocol...
            </span>
          ) : (
            'Register Protocol'
          )}
        </button>
      </div>

      <p className="text-sm text-gray-500 text-center">
        * Required fields
      </p>
    </form>
  );
}
