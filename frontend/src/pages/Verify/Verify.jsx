import React, { useContext, useEffect } from "react";
import "./Verify.css";
import { useNavigate, useSearchParams } from "react-router-dom";
import { StoreContext } from "../../context/StoreContext";
import axios from "axios";

const Verify = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const sessionId = searchParams.get("session_id"); // ✅ Stripe passes session_id in the URL
  const cancel = searchParams.get("cancel");
  const { url } = useContext(StoreContext);
  const navigate = useNavigate();

  const verifyPayment = async () => {
    try {
      // If user canceled the payment
      if (cancel === "true") {
        await axios.post(`${url}/api/order/verify`, { orderId, sessionId: null });
        navigate("/");
        return;
      }

      // ✅ Verify with backend (send sessionId)
      const response = await axios.post(`${url}/api/order/verify`, {
        orderId,
        sessionId,
      });

      if (response.data.success) {
        navigate("/myorders");
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error("Payment verification failed:", error);
      navigate("/");
    }
  };

  useEffect(() => {
    verifyPayment();
  }, []);

  return (
    <div className="verify">
      <div className="spinner"></div>
    </div>
  );
};

export default Verify;

