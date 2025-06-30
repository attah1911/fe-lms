import PageHead from "../../commons/PageHead";
import { Fragment, ReactNode } from "react";

interface PropTypes {
    children: ReactNode
    title?: string;
}

const AuthLayout = (props: PropTypes) => {
    const {children, title} = props;
    return (
        <div className="h-screen overflow-hidden relative">
            <PageHead title={title} />
            <section className="h-full flex items-center justify-center">
                {children}
            </section>
        </div>
    )
}

export default AuthLayout;
