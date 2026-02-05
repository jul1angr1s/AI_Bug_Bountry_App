import { useState, useEffect } from 'react';
import { GradientButton } from '../shared/GradientButton';
import { MaterialIcon } from '../shared/MaterialIcon';
import type { CreateProtocolRequest } from '../../lib/api';

interface ProtocolFormProps {
  onSubmit: (data: CreateProtocolRequest) => Promise<void>;
  isSubmitting?: boolean;
  initialValues?: Partial<CreateProtocolRequest>;
}

interface FormErrors {
  githubUrl?: string;
  contractPath?: string;
  contractName?: string;
  bountyTerms?: string;
  ownerAddress?: string;
}

export default function ProtocolForm({ onSubmit, isSubmitting = false, initialValues }: ProtocolFormProps) {
  const [formData, setFormData] = useState<CreateProtocolRequest>({
    githubUrl: '',
    branch: 'main',
    contractPath: '',
    contractName: '',
    bountyTerms: 'Standard bug bounty terms: Critical - $10,000, High - $5,000, Medium - $1,000, Low - $500',
    ownerAddress: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});

  // Update form data when initialValues prop changes
  useEffect(() => {
    if (initialValues) {
      setFormData(prev => ({
        ...prev,
        ...initialValues
      }));
    }
  }, [initialValues]);

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

    if (!formData.bountyTerms.trim()) {
      newErrors.bountyTerms = 'Bounty terms are required';
    }

    if (!formData.ownerAddress.trim()) {
      newErrors.ownerAddress = 'Owner address is required';
    } else if (!validateEthereumAddress(formData.ownerAddress)) {
      newErrors.ownerAddress = 'Must be a valid Ethereum address (0x...)';
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
      {/* GitHub URL */}
      <div>
        <label htmlFor="githubUrl" className="flex items-center gap-2 text-sm font-semibold text-gray-200 mb-2">
          <MaterialIcon name="link" className="text-base text-purple-400" />
          GitHub Repository URL *
        </label>
        <input
          type="text"
          id="githubUrl"
          value={formData.githubUrl}
          onChange={(e) => handleChange('githubUrl', e.target.value)}
          className={`w-full px-4 py-3 bg-[#0f1723] border ${
            errors.githubUrl ? 'border-red-500' : 'border-[#2f466a]'
          } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all`}
          placeholder="https://github.com/Cyfrin/2023-11-Thunder-Loan"
          disabled={isSubmitting}
        />
        {errors.githubUrl && (
          <div className="flex items-center gap-2 mt-2">
            <MaterialIcon name="error" className="text-sm text-red-400" />
            <p className="text-sm text-red-400">{errors.githubUrl}</p>
          </div>
        )}
      </div>

      {/* Branch */}
      <div>
        <label htmlFor="branch" className="flex items-center gap-2 text-sm font-semibold text-gray-200 mb-2">
          <MaterialIcon name="account_tree" className="text-base text-cyan-400" />
          Branch
        </label>
        <input
          type="text"
          id="branch"
          value={formData.branch}
          onChange={(e) => handleChange('branch', e.target.value)}
          className="w-full px-4 py-3 bg-[#0f1723] border border-[#2f466a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          placeholder="main"
          disabled={isSubmitting}
        />
      </div>

      {/* Contract Path */}
      <div>
        <label htmlFor="contractPath" className="flex items-center gap-2 text-sm font-semibold text-gray-200 mb-2">
          <MaterialIcon name="folder_open" className="text-base text-purple-400" />
          Contract Path *
        </label>
        <input
          type="text"
          id="contractPath"
          value={formData.contractPath}
          onChange={(e) => handleChange('contractPath', e.target.value)}
          className={`w-full px-4 py-3 bg-[#0f1723] border ${
            errors.contractPath ? 'border-red-500' : 'border-[#2f466a]'
          } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all`}
          placeholder="src/protocol/ThunderLoan.sol"
          disabled={isSubmitting}
        />
        {errors.contractPath && (
          <div className="flex items-center gap-2 mt-2">
            <MaterialIcon name="error" className="text-sm text-red-400" />
            <p className="text-sm text-red-400">{errors.contractPath}</p>
          </div>
        )}
      </div>

      {/* Contract Name */}
      <div>
        <label htmlFor="contractName" className="flex items-center gap-2 text-sm font-semibold text-gray-200 mb-2">
          <MaterialIcon name="code" className="text-base text-cyan-400" />
          Contract Name *
        </label>
        <input
          type="text"
          id="contractName"
          value={formData.contractName}
          onChange={(e) => handleChange('contractName', e.target.value)}
          className={`w-full px-4 py-3 bg-[#0f1723] border ${
            errors.contractName ? 'border-red-500' : 'border-[#2f466a]'
          } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all`}
          placeholder="ThunderLoan"
          disabled={isSubmitting}
        />
        {errors.contractName && (
          <div className="flex items-center gap-2 mt-2">
            <MaterialIcon name="error" className="text-sm text-red-400" />
            <p className="text-sm text-red-400">{errors.contractName}</p>
          </div>
        )}
      </div>

      {/* Owner Address */}
      <div>
        <label htmlFor="ownerAddress" className="flex items-center gap-2 text-sm font-semibold text-gray-200 mb-2">
          <MaterialIcon name="account_balance_wallet" className="text-base text-purple-400" />
          Owner Address *
        </label>
        <input
          type="text"
          id="ownerAddress"
          value={formData.ownerAddress}
          onChange={(e) => handleChange('ownerAddress', e.target.value)}
          className={`w-full px-4 py-3 bg-[#0f1723] border ${
            errors.ownerAddress ? 'border-red-500' : 'border-[#2f466a]'
          } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all`}
          placeholder="0x..."
          disabled={isSubmitting}
        />
        {errors.ownerAddress && (
          <div className="flex items-center gap-2 mt-2">
            <MaterialIcon name="error" className="text-sm text-red-400" />
            <p className="text-sm text-red-400">{errors.ownerAddress}</p>
          </div>
        )}
        <p className="mt-2 text-sm text-gray-500">
          Your wallet address that owns this protocol
        </p>
      </div>

      {/* Bounty Terms (optional - hidden field with default) */}
      <input type="hidden" name="bountyTerms" value={formData.bountyTerms} />

      {/* Submit Button */}
      <div className="pt-4">
        <GradientButton
          variant="primary"
          disabled={isSubmitting}
          className="w-full py-3 text-base"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-3">
              <MaterialIcon name="progress_activity" className="text-xl animate-spin" />
              Registering Protocol...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <MaterialIcon name="add_circle" className="text-xl" />
              Register Protocol
            </span>
          )}
        </GradientButton>
      </div>

      <p className="text-sm text-gray-500 text-center pt-2">
        * Required fields
      </p>
    </form>
  );
}
