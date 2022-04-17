import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {

  const [cart, setCart] = useState<Product[]>(() => {
    const storedCart = localStorage.getItem('@RocketShoes:cart')
    if (storedCart) return JSON.parse(storedCart)
    return []
  })

  const getProduct = (productId: number): Promise<Product> => {
    return api.get(`/products/${productId}`).then(response => ({ ...response.data, amount: 0 }) as Product)
  }

  const checkEnoughStockAvailable = async (productId: number, requestedAmount: number): Promise<boolean> => {
    const stock = await api.get(`/stock/${productId}`).then(response => response.data as Stock)
    return stock.amount >= requestedAmount
  }

  const validateStock = async (productId: number, updatedAmount: number): Promise<boolean> => {
    if (await checkEnoughStockAvailable(productId, updatedAmount)) return true
    toast.error('Quantidade solicitada fora de estoque')
    return false
  }

  const updateCart = (updatedCart: Product[]): void => {
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
    setCart(updatedCart)
  }

  const updateProductInCart = (product: Product, updatedAmount: number, index: number): void => {
    const updatedProduct = { ...product, amount: updatedAmount }
    let updatedCart = [...cart]
    if(index === -1) updatedCart.push(updatedProduct)
    else updatedCart[index] = updatedProduct
    updateCart(updatedCart)
  }

  const addProduct = async (productId: number): Promise<void> => {
    try {
      const productIndex = cart.findIndex(product => product.id === productId)
      const product = productIndex === -1 ? await getProduct(productId) : cart[productIndex]
      const updatedAmount = product.amount + 1
      if (await validateStock(productId, updatedAmount)) updateProductInCart(product, updatedAmount, productIndex)
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = cart.filter(product => product.id !== productId)
      if (updatedCart.length === cart.length) toast.error('Erro na remoção do produto');
      else updateCart(updatedCart)
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({ productId, amount }: UpdateProductAmount): Promise<void> => {
    try {
      if (amount <= 0) return
      const productIndex = cart.findIndex(product => product.id === productId)
      const product = cart[productIndex]
      if (await validateStock(productId, amount)) updateProductInCart(product, amount, productIndex)
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider value={{ cart, addProduct, removeProduct, updateProductAmount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
