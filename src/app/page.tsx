/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";

// Extend the Window interface to include the ethereum property
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (
        event: string,
        callback: (...args: any[]) => void
      ) => void;
      isMetaMask?: boolean;
    };
  }
}

import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useColorMode,
  useColorModeValue,
  IconButton,
  Stack,
  Image,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Badge,
  Divider,
  useToast,
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { css } from "@emotion/css";
import {
  FaMoon,
  FaSun,
  FaTwitter,
  FaDiscord,
  FaTelegram,
} from "react-icons/fa";
import { SiTarget } from "react-icons/si";
import {
  createPublicClient,
  http,
  parseAbi,
  formatEther,
  createWalletClient,
  custom,
} from "viem";
import { saigon, ronin } from "viem/chains";
import { abi } from "@/lib/abi.json";
import {
  ConnectorError,
  ConnectorErrorType,
  requestRoninWalletConnector,
} from "@sky-mavis/tanto-connect";

const NFT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as string;
const KTTY_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_KTTY_ADDRESS as string;

const currentChain =
  (process.env.NEXT_PUBLIC_CHAIN as string) === "ronin" ? ronin : saigon;

// Parse the ABI from your contract
const NFT_ABI = abi;

// ERC20 Token ABI (for RON and KTTY tokens)
const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
]);

// Animations
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const floatAnimation = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

const glowAnimation = keyframes`
  0% { filter: drop-shadow(0 0 5px rgba(124, 58, 237, 0.6)); }
  50% { filter: drop-shadow(0 0 15px rgba(124, 58, 237, 0.8)); }
  100% { filter: drop-shadow(0 0 5px rgba(124, 58, 237, 0.6)); }
`;

function Home() {
  const [connector, setConnector] = useState<any>(null);
  const [error, setError] = useState<any>(null);

  const switchChain = async (chainId: any) => {
    try {
      await connector?.switchChain(chainId);
    } catch (error) {
      console.error(error);
    }
  };

  const getRoninWalletConnector = async () => {
    try {
      const connector = await requestRoninWalletConnector();

      return connector;
    } catch (error) {
      if (error instanceof ConnectorError) {
        setError(error.name);
      }

      return null;
    }
  };

  useEffect(() => {
    getRoninWalletConnector().then((connector) => {
      setConnector(connector);
    });
  }, []);

  const { colorMode, toggleColorMode } = useColorMode();
  const [mintAmount, setMintAmount] = useState(1);
  const [isConnected, setIsConnected] = useState(false);
  const toast = useToast();

  // Color mode values
  const bgColor = useColorModeValue("#f8fafc", "#0f172a");
  const cardBg = useColorModeValue("#ffffff", "#1e293b");
  const accentColor = useColorModeValue("purple.600", "purple.400");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  // New state variables for contract integration
  const [account, setAccount] = useState<string | null>(null);
  const [publicClient, setPublicClient] = useState<any>(null);
  const [walletClient, setWalletClient] = useState<any>(null);
  const [ronPrice, setRonPrice] = useState<string | null>(null);
  const [discountedRonPrice, setDiscountedRonPrice] = useState<string | null>(
    null
  );
  const [kttyAmount, setKttyAmount] = useState<string | null>(null);
  const [availableNFTs, setAvailableNFTs] = useState<number[]>([]);
  const [isApproved, setIsApproved] = useState({ ktty: false });
  const [loading, setLoading] = useState(false);
  const [currentPhase, setCurrentPhase] = useState("0");

  const [walletDisplay, setWalletDisplay] = useState("");
  const [balances, setBalances] = useState({ ron: "0", ktty: "0" });
  const [showWalletMenu, setShowWalletMenu] = useState(false);

  // Add this effect to refresh balances periodically when connected
  useEffect(() => {
    console.log("isConnected:", isConnected);
    console.log("account:", account);
    console.log("publicClient:", publicClient);
    if (isConnected && account && publicClient) {
      // Fetch balances initially
      fetchBalances(publicClient, account);

      // Set up interval to refresh balances every 15 seconds
      const intervalId = setInterval(() => {
        fetchBalances(publicClient, account);
      }, 5000);

      return () => clearInterval(intervalId);
    }
  }, [isConnected, account, publicClient]);

  useEffect(() => {
    // Create Viem clients
    const publicClient = createPublicClient({
      chain: currentChain,
      transport: http(),
    });

    setPublicClient(publicClient);

    // Fetch contract data
    fetchContractData(publicClient);
  }, []);

  // Connect wallet function (replace the existing handleConnect function)
  const handleConnect = async () => {
    try {
      // Check if MetaMask is installed
      // if (!window.ethereum) {
      //   toast({
      //     title: "Ronin Wallet not detected",
      //     description: "Please install MetaMask to use this app.",
      //     status: "error",
      //     duration: 3000,
      //     isClosable: true,
      //   });
      //   return;
      // }

      if (!connector && error === ConnectorErrorType.PROVIDER_NOT_FOUND) {
        window.open("https://wallet.roninchain.com", "_blank");
        return;
      }

      const connectResult = await connector?.connect();

      if (connectResult) {
        if (connectResult.chainId !== currentChain.id)
          switchChain(currentChain.id);

        const provider = await connector.getProvider();
        const accounts = await connector?.getAccounts();

        const account = accounts[0];

        setAccount(account);

        provider.handleAccountsChanged = (accounts: string[]) => {
          if (accounts.length === 0) {
            setIsConnected(false);
            setAccount(null);
            setWalletDisplay("");
            setBalances({ ron: "0", ktty: "0" });
            setShowWalletMenu(false);
          } else {
            setAccount(accounts[0]);
          }
        };

        // Create Viem clients
        const publicClient = createPublicClient({
          chain: currentChain,
          transport: http(),
        });

        const walletClient = createWalletClient({
          chain: currentChain,
          transport: custom(provider),
        });

        setPublicClient(publicClient);
        setWalletClient(walletClient);

        // Fetch contract data
        await fetchContractData(publicClient);
        await fetchBalances(publicClient, account);

        setIsConnected(true);

        toast({
          title: "Wallet connected",
          description: "Your wallet has been connected successfully.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error("Connection error:", error);
      toast({
        title: "Connection failed",
        description: "Failed to connect wallet.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Function to fetch contract data
  const fetchContractData = async (client: any) => {
    try {
      // Get prices from NFT contract
      const ronTokenPrice = await client.readContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: NFT_ABI,
        functionName: "ronTokenPrice",
      });

      const ronAndNativePrice = await client.readContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: NFT_ABI,
        functionName: "ronAndNativePrice",
      });

      const nativeTokenAmount = await client.readContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: NFT_ABI,
        functionName: "nativeTokenAmount",
      });

      const phase = await client.readContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: NFT_ABI,
        functionName: "currentPhase",
      });

      console.log("Phase:", phase);
      setCurrentPhase(phase.toString());

      // Convert prices from wei
      setRonPrice(formatEther(ronTokenPrice));
      setDiscountedRonPrice(formatEther(ronAndNativePrice));
      setKttyAmount(formatEther(nativeTokenAmount));

      // Check for available NFTs (this would need to be implemented according to your contract structure)
      // For example, you might scan tokenIds to find ones that are available
      const availableIds = await findAvailableNFTs();
      setAvailableNFTs(availableIds);

      if (availableIds.length == 0) {
        toast({
          title: "No NFTs available",
          description: "There are no NFTs available for minting.",
          status: "info",
          duration: 3000,
          isClosable: true,
        });
      }

      // Check if tokens are approved
      // await checkApprovals(client, userAccount);
    } catch (error) {
      console.error("Error fetching contract data:", error);
      toast({
        title: "Failed to fetch contract data",
        description: "An error occurred when loading contract data.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Function to find available NFTs (this is a sample implementation)
  const findAvailableNFTs = async () => {
    const data = await fetch("/api/available");
    const response = await data.json();
    return response.token_ids;
  };

  // Add this function to fetch token balances
  const fetchBalances = async (client: any, account: any) => {
    console.log("Fetching balances for account:", account);
    try {
      // Get RON balance
      const ronBalance = await client.getBalance({ address: account });

      // Get KTTY balance
      const kttyBalance = await client.readContract({
        address: KTTY_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [account],
      });

      // Format balances
      setBalances({
        ron: formatEther(ronBalance),
        ktty: formatEther(kttyBalance),
      });

      // Format address for display (0x1234...5678)
      setWalletDisplay(
        `${account.substring(0, 6)}...${account.substring(account.length - 4)}`
      );
    } catch (error) {
      console.error("Error fetching balances:", error);
    }
  };

  // Add disconnect function
  const handleDisconnect = async () => {
    setAccount(null);
    setIsConnected(false);
    setWalletDisplay("");
    setBalances({ ron: "0", ktty: "0" });
    setShowWalletMenu(false);

    await connector?.disconnect();

    toast({
      title: "Wallet disconnected",
      description: "Your wallet has been disconnected.",
      status: "info",
      duration: 3000,
      isClosable: true,
    });
  };

  // Check if tokens are approved for spending
  const checkApprovals = async (client: any, userAccount: any) => {
    try {
      // Check KTTY allowance
      const kttyAllowance = await client.readContract({
        address: KTTY_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [userAccount, NFT_CONTRACT_ADDRESS],
      });

      const nativeTokenAmount = await client.readContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: NFT_ABI,
        functionName: "nativeTokenAmount",
      });

      // Set approval status
      setIsApproved({
        ktty: kttyAllowance >= nativeTokenAmount,
      });
    } catch (error) {
      console.error("Error checking approvals:", error);
    }
  };

  // Function to approve token spending
  const approveTokens = async (tokenType: string, amount: bigint) => {
    try {
      setLoading(true);

      if (!ronPrice || !kttyAmount) {
        toast({
          title: "Price data not available",
          description: "Please fetch contract data first.",
          status: "warning",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      if (!walletClient || !publicClient) {
        toast({
          title: "Wallet client not initialized",
          description: "Please connect your wallet.",
          status: "warning",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      const tokenAddress = KTTY_TOKEN_ADDRESS;

      // 1) Read the existing allowance via publicClient (read‑only)
      const currentAllowance = await publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [account, NFT_CONTRACT_ADDRESS],
      });

      if (currentAllowance >= amount) {
        toast({
          title: "Already approved",
          description: `You’ve already approved enough ${tokenType.toUpperCase()}.`,
          status: "info",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      const hash = await walletClient.writeContract({
        account: account,
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [NFT_CONTRACT_ADDRESS, amount - currentAllowance],
      });

      toast({
        title: "Approval submitted",
        description: `Approval transaction submitted for ${tokenType.toUpperCase()}.`,
        status: "info",
        duration: 3000,
        isClosable: true,
      });

      // Wait for transaction confirmation
      await publicClient.waitForTransactionReceipt({ hash });

      // Update approval status
      await checkApprovals(publicClient, account);

      toast({
        title: "Approval successful",
        description: `You've approved ${tokenType.toUpperCase()} for spending.`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error(`Error approving ${tokenType}:`, error);
      toast({
        title: "Approval failed",
        description: `Failed to approve ${tokenType.toUpperCase()}.`,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to check if account is whitelisted
  const isWhitelisted = async (proof: any) => {
    try {
      if (!publicClient || !account) {
        toast({
          title: "Wallet client not initialized",
          description: "Please connect your wallet.",
          status: "warning",
          duration: 3000,
          isClosable: true,
        });
        return false;
      }

      const whitelisted = await publicClient.readContract({
        account: account,
        address: NFT_CONTRACT_ADDRESS,
        abi: NFT_ABI,
        functionName: "isWhitelisted",
        args: [proof, BigInt(currentPhase)],
      });

      if (!whitelisted) {
        toast({
          title: "Unable to mint",
          description: "You have not been whitelisted for this phase.",
          status: "warning",
          duration: 3000,
          isClosable: true,
        });
        return false;
      }
    } catch (error) {
      console.error(`Error checking whitelist`, error);
      toast({
        title: "Whitelist check failed",
        description: "Failed to check whitelist status.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return false;
    }
    return true;
  };

  function randomNft() {
    const randomIndex = Math.floor(Math.random() * availableNFTs.length);
    return availableNFTs[randomIndex];
  }

  async function getProof(address: string, phase: string) {
    const searchParams = new URLSearchParams();
    searchParams.append("phase", phase);
    searchParams.append("address", address);
    const url = `/api/proof?${searchParams.toString()}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    console.log("Proof", data.proof);

    return data.proof;
  }

  async function updateAvailableNFTs() {
    // Refresh available NFTs
    const availableIds = await findAvailableNFTs();
    setAvailableNFTs(availableIds);

    if (availableIds.length == 0) {
      toast({
        title: "No More NFTs available",
        description: "There are no NFTs available for minting.",
        status: "info",
        duration: 3000,
        isClosable: true,
      });
    }
  }

  async function updateMintedNft(tokenIds: number[]) {
    const response = await fetch("/api/update", {
      method: "POST",
      body: JSON.stringify({ token_ids: tokenIds }),
    });
    const data = await response.json();
    console.log("NFT updated:", data);

    // Refresh available NFTs
    const availableIds = await findAvailableNFTs();
    setAvailableNFTs(availableIds);

    if (availableIds.length == 0) {
      toast({
        title: "No More NFTs available",
        description: "There are no NFTs available for minting.",
        status: "info",
        duration: 3000,
        isClosable: true,
      });
    }

    setIsApproved({ ktty: false });
  }

  // Function to mint with RON
  const mintWithRon = async () => {
    if (!account) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to mint.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    if (currentPhase === "0") {
      toast({
        title: "Minting has not started",
        description: "Minting is not available at the moment",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    try {
      // First check if RON is approved
      const totalAmount = BigInt(parseFloat(ronPrice!) * mintAmount * 10 ** 18);
      console.log("totalAmount", totalAmount)
      setLoading(true);

      // Mint with RON
      const proof = await getProof(account, currentPhase);
      console.log("Proof", proof);
      const whitelisted = await isWhitelisted(proof);
      if (!whitelisted) {
        return;
      }
      await updateAvailableNFTs();
      if (availableNFTs.length == 0) {
        return;
      }
      if (availableNFTs.length < mintAmount) {
        toast({
          title: "Not enough NFTs available",
          description: "Not enough NFTs available for minting.",
          status: "warning",
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      const selectedNFT = Array.from({ length: mintAmount }, randomNft);
      const hash = await walletClient.writeContract({
        account: account,
        address: NFT_CONTRACT_ADDRESS,
        abi: NFT_ABI,
        functionName: "mintWithRon",
        args: [selectedNFT, proof],
        value: totalAmount,
      });

      toast({
        title: "Minting transaction submitted",
        description: "Your minting transaction has been submitted.",
        status: "info",
        duration: 3000,
        isClosable: true,
      });

      // Wait for transaction confirmation
      await publicClient.waitForTransactionReceipt({ hash });

      toast({
        title: "Minting successful",
        description: "Your NFT has been minted successfully!",
        status: "success",
        duration: 5000,
        isClosable: true,
      });

      // Update available NFTs
      await updateMintedNft(selectedNFT);
    } catch (error) {
      console.error("Error minting with RON:", error);
      toast({
        title: "Minting failed",
        description: "Failed to mint NFT with RON.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to mint with RON + KTTY
  const mintWithRonAndKtty = async () => {
    if (!account) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to mint.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    if (currentPhase === "0") {
      toast({
        title: "Minting has not started",
        description: "Minting is not available at the moment",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    try {
      // First check if RON is approved
      const ronAmount = BigInt(
        parseFloat(discountedRonPrice!) * mintAmount * 10 ** 18
      );

      // Then check if KTTY is approved
      const _kttyAmount = BigInt(
        parseFloat(kttyAmount!) * mintAmount * 10 ** 18
      );
      await approveTokens("ktty", _kttyAmount);
      setLoading(true);

      // Mint with RON + KTTY
      const proof = await getProof(account, currentPhase);
      const whitelisted = await isWhitelisted(proof);
      if (!whitelisted) {
        return;
      }
      await updateAvailableNFTs();
      if (availableNFTs.length == 0) {
        return;
      }
      if (availableNFTs.length < mintAmount) {
        toast({
          title: "Not enough NFTs available",
          description: "Not enough NFTs available for minting.",
          status: "warning",
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      const selectedNFT = Array.from({ length: mintAmount }, randomNft);
      const hash = await walletClient.writeContract({
        account: account,
        address: NFT_CONTRACT_ADDRESS,
        abi: NFT_ABI,
        functionName: "mintWithRonAndNative",
        args: [selectedNFT, proof],
        value: ronAmount,
      });

      toast({
        title: "Minting transaction submitted",
        description: "Your minting transaction has been submitted.",
        status: "info",
        duration: 3000,
        isClosable: true,
      });

      // Wait for transaction confirmation
      await publicClient.waitForTransactionReceipt({ hash });
      toast({
        title: "Minting successful",
        description: "Your NFT has been minted successfully with RON + KTTY!",
        status: "success",
        duration: 5000,
        isClosable: true,
      });

      // Update available NFTs
      await updateMintedNft(selectedNFT);
    } catch (error) {
      console.error("Error minting with RON + KTTY:", error);
      toast({
        title: "Minting failed",
        description: "Failed to mint NFT with RON + KTTY.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const clr1 = useColorModeValue("purple.50", "purple.900");
  const clr2 = useColorModeValue("gray.100", "gray.700");
  const clr3 = useColorModeValue("gray.200", "gray.600");

  return (
    <Box minH="100vh" bg={bgColor} transition="background 0.2s ease">
      {/* Nav */}
      <Box
        borderBottom="1px solid"
        borderColor={borderColor}
        position="sticky"
        top="0"
        zIndex="sticky"
        backdropFilter="blur(10px)"
        bg={
          colorMode === "dark"
            ? "rgba(15, 23, 42, 0.8)"
            : "rgba(248, 250, 252, 0.8)"
        }
      >
        <Flex
          py={4}
          px={[4, 6, 8]}
          justifyContent="space-between"
          alignItems="center"
          maxW="container.xl"
          mx="auto"
        >
          <Flex alignItems="center">
            <Box
              className={css`
                animation: ${floatAnimation} 3s ease-in-out infinite;
              `}
            >
              {/* <Text
                fontSize="2xl"
                fontWeight="bold"
                bgGradient="linear(to-r, purple.400, pink.400)"
                bgClip="text"
              >
                KttyWorld
              </Text> */}
              <Image
                w={{
                  base: "80px",
                  md: "100px",
                }}
                src={"/logo.png"}
                alt=""
              />
            </Box>
          </Flex>

          <HStack spacing={4}>
            <HStack
              display={{ base: "none", md: "flex" }}
              spacing={4}
              className={css`
                animation: ${fadeIn} 1s ease-out;
              `}
            >
              <IconButton
                aria-label="Twitter"
                icon={<FaTwitter />}
                variant="ghost"
                color={accentColor}
                _hover={{ bg: clr2 }}
              />
              <IconButton
                aria-label="Discord"
                icon={<FaDiscord />}
                variant="ghost"
                color={accentColor}
                _hover={{ bg: clr2 }}
              />
              <IconButton
                aria-label="Telegram"
                icon={<FaTelegram />}
                variant="ghost"
                color={accentColor}
                _hover={{ bg: clr2 }}
              />
            </HStack>

            <IconButton
              aria-label="Toggle dark mode"
              icon={colorMode === "dark" ? <FaSun /> : <FaMoon />}
              onClick={toggleColorMode}
              variant="ghost"
              color={accentColor}
              _hover={{ bg: clr2 }}
            />

            {isConnected ? (
              <Box position="relative">
                <Button
                  onClick={() => setShowWalletMenu(!showWalletMenu)}
                  variant="ghost"
                  px={4}
                  bg={clr2}
                  _hover={{ bg: clr3 }}
                  borderRadius="xl"
                  rightIcon={
                    <Box as="span" ml={1}>
                      ▼
                    </Box>
                  }
                >
                  <HStack spacing={2}>
                    <Box
                      w="10px"
                      h="10px"
                      borderRadius="full"
                      bg="green.400"
                      boxShadow="0 0 0 2px white"
                    />
                    <Text>{walletDisplay}</Text>
                  </HStack>
                </Button>

                {showWalletMenu && (
                  <Box
                    position="absolute"
                    top="100%"
                    right="0"
                    mt={2}
                    bg={cardBg}
                    boxShadow="lg"
                    borderRadius="xl"
                    borderWidth="1px"
                    borderColor={borderColor}
                    p={4}
                    width="240px"
                    zIndex={10}
                  >
                    <VStack align="stretch" spacing={3}>
                      <Box mb={2}>
                        <Text fontSize="sm" opacity={0.7}>
                          Wallet Address
                        </Text>
                        <Text fontSize="sm" fontWeight="medium" isTruncated>
                          {account}
                        </Text>
                      </Box>

                      <Divider />

                      <Box>
                        <HStack justify="space-between">
                          <Text fontSize="sm">RON Balance</Text>
                          <Text fontSize="sm" fontWeight="bold">
                            {parseFloat(balances.ron).toLocaleString()}
                          </Text>
                        </HStack>
                        <HStack justify="space-between" mt={1}>
                          <Text fontSize="sm">KTTY Balance</Text>
                          <Text fontSize="sm" fontWeight="bold">
                            {parseFloat(balances.ktty).toLocaleString()}
                          </Text>
                        </HStack>
                      </Box>

                      <Divider />

                      <Button
                        size="sm"
                        variant="outline"
                        colorScheme="red"
                        onClick={handleDisconnect}
                        leftIcon={<Box as="span">⏻</Box>}
                      >
                        Disconnect Wallet
                      </Button>
                    </VStack>
                  </Box>
                )}
              </Box>
            ) : (
              <Button
                onClick={handleConnect}
                variant="primary"
                size={{ base: "sm", md: "md" }}
              >
                Connect Wallet
              </Button>
            )}
          </HStack>
        </Flex>
      </Box>

      {/* Hero Section */}
      <Container maxW="container.xl" py={12}>
        <Flex
          direction={{ base: "column", lg: "row" }}
          gap={10}
          alignItems="center"
          className={css`
            animation: ${fadeIn} 1s ease-out;
          `}
        >
          {/* Left side - NFT Preview */}
          <Box
            flex="1"
            className={css`
              animation: ${floatAnimation} a3s ease-in-out infinite,
                ${glowAnimation} 4s infinite;
            `}
          >
            <Box
              borderRadius="2xl"
              overflow="hidden"
              boxShadow="xl"
              transition="transform 0.3s ease-in-out"
              _hover={{ transform: "scale(1.02)" }}
            >
              <Image
                src={"/tamergif.gif"}
                alt="NFT Preview"
                objectFit="cover"
                w={"100%"}
              />
            </Box>
          </Box>

          {/* Right side - Mint Interface */}
          <VStack flex="1" spacing={8} alignItems="flex-start">
            <VStack alignItems="flex-start" spacing={3}>
              <Badge
                colorScheme="purple"
                fontSize="md"
                py={1}
                px={3}
                borderRadius="full"
              >
                Minting Now
              </Badge>
              <Heading
                size="2xl"
                bgGradient="linear(to-r, purple.400, pink.400)"
                bgClip="text"
              >
                KTTY World Tamers Collection
              </Heading>
              <Text fontSize="lg" opacity={0.8}>
                Mint your Tamer and take the first steps into the world of Felycia! You can mint using RON or combine RON with KTTY
                tokens for special discounts.
              </Text>
            </VStack>

            <Box
              bg={cardBg}
              p={6}
              borderRadius="2xl"
              boxShadow="lg"
              w="full"
              border="1px solid"
              borderColor={borderColor}
            >
              <VStack spacing={6} align="stretch">
                <Tabs variant="soft-rounded" colorScheme="purple" isFitted>
                  <TabList mb={4}>
                    <Tab _selected={{ bg: accentColor, color: "white" }}>
                      RON Only
                    </Tab>
                    <Tab _selected={{ bg: accentColor, color: "white" }}>
                      RON + KTTY
                    </Tab>
                  </TabList>
                  <TabPanels>
                    {/* RON Only Tab */}
                    <TabPanel px={0}>
                      <VStack spacing={4} align="stretch">
                        <Flex justify="space-between">
                          <Text fontWeight="medium">Price per NFT</Text>
                          <Text fontWeight="bold">
                            {ronPrice ? `${ronPrice} RON` : "Loading..."}
                          </Text>
                        </Flex>

                        <Box>
                          <Text mb={2} fontWeight="medium">
                            Amount to mint
                          </Text>
                          <NumberInput
                            min={1}
                            max={3}
                            value={mintAmount}
                            onChange={(_, value) => setMintAmount(value)}
                            bg={useColorModeValue("gray.50", "gray.800")}
                            borderRadius="lg"
                          >
                            <NumberInputField borderRadius="lg" />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                        </Box>

                        <Divider />

                        <Flex justify="space-between">
                          <Text fontWeight="semibold">Total</Text>
                          <Text fontWeight="bold" fontSize="lg">
                            {ronPrice
                              ? `${(parseFloat(ronPrice) * mintAmount).toFixed(
                                  3
                                )} RON`
                              : "Loading..."}
                          </Text>
                        </Flex>

                        <Button
                          onClick={mintWithRon}
                          variant="primary"
                          size="lg"
                          isLoading={loading}
                          loadingText="Minting..."
                          disabled={
                            !isConnected ||
                            availableNFTs.length === 0 ||
                            loading ||
                            currentPhase === "0"
                          }
                          _disabled={{ opacity: 0.6, cursor: "not-allowed" }}
                        >
                          {!isConnected
                            ? "Connect Wallet to Mint"
                            : "Mint with RON"}
                        </Button>
                      </VStack>
                    </TabPanel>

                    {/* RON + KTTY Tab */}
                    <TabPanel px={0}>
                      <VStack spacing={4} align="stretch">
                        <HStack
                          bg={clr1}
                          p={3}
                          borderRadius="lg"
                          borderWidth="1px"
                          borderColor={useColorModeValue(
                            "purple.100",
                            "purple.700"
                          )}
                        >
                          <Badge colorScheme="purple" px={2} py={1}>
                            DISCOUNT
                          </Badge>
                          <Text fontSize="sm">
                            Save by using KTTY tokens along with RON!
                          </Text>
                        </HStack>

                        <Flex justify="space-between">
                          <Text fontWeight="medium">Discounted price</Text>
                          <Text fontWeight="bold">
                            {discountedRonPrice && kttyAmount
                              ? `${discountedRonPrice} RON + ${kttyAmount} KTTY`
                              : "Loading..."}
                          </Text>
                        </Flex>

                        <Box>
                          <Text mb={2} fontWeight="medium">
                            Amount to mint
                          </Text>
                          <NumberInput
                            min={1}
                            max={3}
                            value={mintAmount}
                            onChange={(_, value) => setMintAmount(value)}
                            bg={useColorModeValue("gray.50", "gray.800")}
                            borderRadius="lg"
                          >
                            <NumberInputField borderRadius="lg" />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                        </Box>

                        <Divider />

                        <Flex justify="space-between">
                          <Text fontWeight="semibold">Total</Text>
                          <VStack align="flex-end" spacing={0}>
                            <Text fontWeight="bold" fontSize="lg">
                              {discountedRonPrice
                                ? `${(
                                    parseFloat(discountedRonPrice) * mintAmount
                                  ).toFixed(3)} RON`
                                : "Loading..."}
                            </Text>
                            <Text
                              fontSize="sm"
                              color={useColorModeValue("gray.600", "gray.400")}
                            >
                              {kttyAmount
                                ? `+ ${(
                                    parseFloat(kttyAmount) * mintAmount
                                  ).toFixed(3)} KTTY`
                                : "Loading..."}
                            </Text>
                          </VStack>
                        </Flex>

                        <Button
                          onClick={mintWithRonAndKtty}
                          variant="primary"
                          size="lg"
                          isLoading={loading}
                          loadingText="Minting..."
                          disabled={
                            !isConnected ||
                            availableNFTs.length === 0 ||
                            loading ||
                            currentPhase === "0"
                          }
                          _disabled={{ opacity: 0.6, cursor: "not-allowed" }}
                          bgGradient="linear(to-r, purple.500, pink.500)"
                          _hover={{
                            bgGradient: "linear(to-r, purple.400, pink.400)",
                            transform: "translateY(-2px)",
                            boxShadow: "lg",
                          }}
                        >
                          {!isConnected
                            ? "Connect Wallet to Mint"
                            : !isApproved.ktty
                            ? "Approve Tokens"
                            : "Mint with RON + KTTY"}
                        </Button>
                      </VStack>
                    </TabPanel>
                  </TabPanels>
                </Tabs>
              </VStack>
            </Box>
          </VStack>
        </Flex>
      </Container>

      {/* Features Section */}
      <Box
        py={16}
        bg={useColorModeValue("gray.50", "gray.900")}
        className={css`
          animation: ${fadeIn} 1.2s ease-out;
        `}
      >
        <Container maxW="container.xl">
          <VStack spacing={12}>
            <VStack spacing={3} textAlign="center">
              <Heading size="xl">What is KTTY World?</Heading>
            </VStack>

            <Stack
              direction={{ base: "column", md: "row" }}
              spacing={8}
              w="full"
            >
              {[
                {
                  title: "Open 3D World",
                  description:
                    "A dynamic and evolving experience that blends adventure, strategy, and social gameplay.",
                },
                {
                  title: "Train & Breed KTTYs",
                  description:
                    "Breed your companions, creating entirely new generations with unique traits and potential.",
                },
                {
                  title: "Play and Earn $KTTY",
                  description:
                    "Earn $KTTY as you explore, hunt and compete alongside your KTTYs",
                },
              ].map((feature, idx) => (
                <Box
                  key={idx}
                  bg={cardBg}
                  p={6}
                  borderRadius="xl"
                  boxShadow="md"
                  borderWidth="1px"
                  borderColor={borderColor}
                  flex="1"
                  transition="transform 0.3s ease, box-shadow 0.3s ease"
                  _hover={{
                    transform: "translateY(-5px)",
                    boxShadow: "lg",
                  }}
                >
                  <VStack align="flex-start" spacing={4}>
                    <Box p={3} borderRadius="lg" bg={clr1} color={accentColor}>
                      <SiTarget />
                    </Box>
                    <Heading size="md">{feature.title}</Heading>
                    <Text>{feature.description}</Text>
                  </VStack>
                </Box>
              ))}
            </Stack>
          </VStack>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        as="footer"
        py={8}
        borderTop="1px solid"
        borderColor={borderColor}
        className={css`
          animation: ${fadeIn} 1.4s ease-out;
        `}
      >
        <Container maxW="container.xl">
          <Flex
            direction={{ base: "column", md: "row" }}
            justify="space-between"
            align={{ base: "center", md: "flex-start" }}
            gap={8}
          >

            <HStack spacing={6}>
              <IconButton
                aria-label="Twitter"
                icon={<FaTwitter />}
                variant="ghost"
                color={accentColor}
                fontSize="xl"
              />
              <IconButton
                aria-label="Discord"
                icon={<FaDiscord />}
                variant="ghost"
                color={accentColor}
                fontSize="xl"
              />
              <IconButton
                aria-label="Telegram"
                icon={<FaTelegram />}
                variant="ghost"
                color={accentColor}
                fontSize="xl"
              />
            </HStack>
          </Flex>

          <Divider my={6} />

          <Flex
            direction={{ base: "column", md: "row" }}
            justify="space-between"
            align="center"
            gap={4}
          >
            <Text fontSize="sm" opacity={0.7}>
              © 2025 KTTY World. All rights reserved.
            </Text>
            <HStack spacing={6}>
              <Text
                as="a"
                href="#"
                fontSize="sm"
                opacity={0.7}
                _hover={{ opacity: 1 }}
              >
                Terms of Service
              </Text>
              <Text
                as="a"
                href="#"
                fontSize="sm"
                opacity={0.7}
                _hover={{ opacity: 1 }}
              >
                Privacy Policy
              </Text>
              <Text
                as="a"
                href="#"
                fontSize="sm"
                opacity={0.7}
                _hover={{ opacity: 1 }}
              >
                FAQ
              </Text>
            </HStack>
          </Flex>
        </Container>
      </Box>
    </Box>
  );
}

export default Home;
